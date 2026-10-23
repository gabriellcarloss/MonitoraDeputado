"""Equipe de gabinete: secretários parlamentares lotados em cada deputado (arquivo de funcionários da Câmara).

O arquivo traz a lotação ATUAL; quem já saiu da equipe não aparece. O salário é estimado pela tabela de
níveis SP01–SP25 (sem auxílios nem gratificações extras), só para dar ordem de grandeza.
"""
import json
import logging
import re
from pathlib import Path

import duckdb
import httpx

from monitora import db
from monitora.config import CACHE_DIR, FUNCIONARIOS_URL, SALARIO_SP
from monitora.http import Client

log = logging.getLogger(__name__)

_ID_LOTACAO = re.compile(r"/deputados/(\d+)")
_NIVEL = re.compile(r"SP\s*0*(\d{1,2})", re.I)


def _data(v) -> str | None:
    s = str(v or "").strip()[:10]
    return s if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s) else None


def parse_secretarios(dados) -> list[tuple]:
    """Linhas (deputado_id, nome, cargo, nivel, salario_estimado, nomeacao, inicio) dos secretários parlamentares."""
    itens = dados.get("dados", []) if isinstance(dados, dict) else dados
    linhas = []
    for f in itens or []:
        if "secret" not in str(f.get("grupo") or "").lower() or "parlamentar" not in str(f.get("grupo") or "").lower():
            continue
        m = _ID_LOTACAO.search(str(f.get("uriLotacao") or ""))
        if not m:
            continue
        cargo = str(f.get("cargo") or "").strip() or None
        n = _NIVEL.search(cargo or "")
        nivel = int(n.group(1)) if n and 1 <= int(n.group(1)) <= 25 else None
        linhas.append((int(m.group(1)), str(f.get("nome") or "").strip(), cargo, nivel, SALARIO_SP.get(nivel),
                       _data(f.get("dataNomeacao")), _data(f.get("dataInicioHistorico"))))
    return linhas


def extract_gabinete(client: Client, con: duckdb.DuckDBPyConnection, cache_dir: Path = CACHE_DIR) -> None:
    con.execute("""CREATE OR REPLACE TABLE secretarios (deputado_id BIGINT, nome VARCHAR, cargo VARCHAR, nivel INTEGER,
        salario_estimado DOUBLE, nomeacao DATE, inicio DATE)""")
    try:
        arq = client.download(FUNCIONARIOS_URL, cache_dir / "arquivos" / "funcionarios.json", max_age_hours=20)
    except httpx.HTTPError as e:
        log.warning("arquivo de funcionários indisponível (%s); equipe de gabinete fica vazia", e)
        client.stale_sources.add("funcionarios")
        return
    linhas = parse_secretarios(json.loads(Path(arq).read_text(encoding="utf-8-sig")))
    # só deputados do painel (a lotação pode apontar para lideranças ou ex-deputados)
    ids = {r[0] for r in con.execute("SELECT id FROM deputados").fetchall()}
    linhas = [r for r in linhas if r[0] in ids]
    db.inserir(con, "secretarios", linhas)
    log.info("secretários parlamentares: %d em %d gabinetes", len(linhas), len({r[0] for r in linhas}))
