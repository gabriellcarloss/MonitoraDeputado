"""Frequência diária no Plenário com a justificativa de cada ausência (serviço legado SitCamaraWS, em XML).

A API v2 só lista quem esteve presente em cada sessão. Sem esta fonte, licença médica e missão oficial
autorizada contariam como falta. Se o serviço estiver fora do ar, o pipeline segue com o que houver em cache
e as ausências sem registro continuam contadas como faltas comuns (a fonte aparece como desatualizada).
"""
import json
import logging
import time
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta
from pathlib import Path

import duckdb

from monitora import db
from monitora.config import CACHE_DIR, LEGADO
from monitora.http import Client
from monitora.normalize import nome as normalizar

log = logging.getLogger(__name__)

FONTE = "SitCamaraWS"  # marcador de fonte desatualizada (export.FONTES)
JUSTIFICADA = "Ausência justificada"
# Justificativas costumam ser lançadas dias depois da sessão: dias recentes são consultados de novo.
DIAS_REVISAO = 45


def _texto(el: ET.Element, tag: str) -> str | None:
    t = (el.findtext(tag) or "").strip()
    return t or None


def parse_dia(xml: bytes) -> tuple[date | None, list[dict]]:
    """ListarPresencasDia → (dia, registros). Dia sem sessão vem como `<dia />` vazio."""
    raiz = ET.fromstring(xml)  # noqa: S314 — XML da fonte oficial; o expat não resolve entidades externas
    data_txt = _texto(raiz, "data")
    if not data_txt:
        return None, []
    dia = datetime.strptime(data_txt[:10], "%d/%m/%Y").date()
    registros = []
    for p in raiz.iter("parlamentar"):
        mat = _texto(p, "carteiraParlamentar")
        registros.append({
            "matricula": int(mat) if mat and mat.isdigit() else None,
            "nome": _texto(p, "nomeParlamentar") or "",
            "frequencia": _texto(p, "descricaoFrequenciaDia") or "",
            "justificativa": _texto(p, "justificativa"),
        })
    return dia, registros


def parse_matriculas(xml: bytes) -> dict[int, int]:
    """ObterDeputados → {matrícula: id da Câmara}. Só traz quem está em exercício hoje."""
    raiz = ET.fromstring(xml)  # noqa: S314
    out = {}
    for d in raiz.iter("deputado"):
        mat, ide = _texto(d, "matricula"), _texto(d, "ideCadastro")
        if mat and ide and mat.isdigit() and ide.isdigit():
            out[int(mat)] = int(ide)
    return out


def _nome_base(nome: str) -> str:
    """'Maria Exemplo-XYZ/MG' → 'MARIA EXEMPLO'."""
    return normalizar(nome.rsplit("-", 1)[0] if "-" in nome else nome)


def _criar_tabela(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("CREATE OR REPLACE TABLE frequencia_dia (data DATE, deputado_id BIGINT, frequencia VARCHAR, justificativa VARCHAR)")


def extract_frequencia(client: Client, con: duckdb.DuckDBPyConnection, cache_dir: Path = CACHE_DIR,
                       hoje: date | None = None) -> None:
    """Preenche frequencia_dia para cada dia que teve sessão deliberativa (tabela sessoes)."""
    hoje = hoje or date.today()
    pasta = cache_dir / "frequencia"
    pasta.mkdir(parents=True, exist_ok=True)
    _criar_tabela(con)
    dias = [r[0] for r in con.execute("SELECT DISTINCT data FROM sessoes WHERE data IS NOT NULL ORDER BY 1").fetchall()]
    if not dias:
        return

    arq_mat = pasta / "matriculas.json"
    matriculas: dict[int, int] = {int(k): v for k, v in json.loads(arq_mat.read_text()).items()} if arq_mat.exists() else {}
    por_dia: dict[date, list[dict]] = {}
    falhou = False
    pendentes = []
    for dia in dias:
        arq = pasta / f"{dia.isoformat()}.json"
        recente = dia >= hoje - timedelta(days=DIAS_REVISAO)
        fresco = arq.exists() and (not recente or time.time() - arq.stat().st_mtime < 20 * 3600)
        if arq.exists():
            por_dia[dia] = json.loads(arq.read_text())
        if not fresco:
            pendentes.append(dia)

    if pendentes:
        try:
            matriculas.update(parse_matriculas(client.get_bytes(f"{LEGADO}/Deputados.asmx/ObterDeputados")))
            arq_mat.write_text(json.dumps(matriculas))
            for dia in pendentes:
                xml = client.get_bytes(f"{LEGADO}/SessoesReunioes.asmx/ListarPresencasDia", {
                    "data": dia.strftime("%d/%m/%Y"), "numLegislatura": "", "numMatriculaParlamentar": "",
                    "siglaPartido": "", "siglaUF": ""})
                data_xml, registros = parse_dia(xml)
                if data_xml is None:
                    continue
                (pasta / f"{dia.isoformat()}.json").write_text(json.dumps(registros, ensure_ascii=False))
                por_dia[dia] = registros
        except Exception as e:  # serviço legado instável: segue com o cache
            falhou = True
            log.warning("frequência diária indisponível (%s); usando %d dia(s) em cache", e, len(por_dia))
    if falhou:
        client.stale_sources.add(FONTE)

    nomes: dict[str, int | None] = {}
    for id_, nome in con.execute("SELECT id, nome FROM deputados").fetchall():
        k = normalizar(nome)
        nomes[k] = None if k in nomes else id_  # nome repetido → ambíguo
    linhas, sem_id = [], 0
    for dia, registros in por_dia.items():
        for r in registros:
            id_ = matriculas.get(r["matricula"]) if r["matricula"] is not None else None
            id_ = id_ or nomes.get(_nome_base(r["nome"]))
            if not id_:
                sem_id += 1
                continue
            linhas.append((dia, id_, r["frequencia"], r["justificativa"]))
    db.inserir(con, "frequencia_dia", linhas)
    log.info("frequência diária: %d registros em %d dias (%d sem identificação)", len(linhas), len(por_dia), sem_id)
