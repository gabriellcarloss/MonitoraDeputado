"""Linha de comando: `monitora run` executa o pipeline completo e publica em web/public/data."""
import argparse
import json
import logging
import shutil
import sys
from datetime import date
from pathlib import Path

import duckdb

from monitora import db
from monitora.config import ANOS, CACHE_DIR, INICIO_LEGISLATURA, OUT_DIR
from monitora.export import exportar
from monitora.extract.ceap import extract_ceap, marcar_passageiros
from monitora.extract.cnpj import enrich_cnpj
from monitora.extract.deputados import extract_deputados
from monitora.extract.emendas import criar_tabelas as criar_tabelas_emendas
from monitora.extract.emendas import extract_emendas
from monitora.extract.frequencia import extract_frequencia
from monitora.extract.gabinete import extract_gabinete
from monitora.extract.presencas import extract_presencas
from monitora.extract.proposicoes import extract_proposicoes
from monitora.extract.votacoes import extract_votacoes
from monitora.http import Client
from monitora.metrics.alertas import gerar_alertas
from monitora.metrics.indicadores import calcular_indicadores
from monitora.metrics.rede import gerar_rede
from monitora.metrics.series import gerar_series
from monitora.validate import validar

log = logging.getLogger("monitora")


def publicar(con: duckdb.DuckDBPyConnection, out_dir: Path, alertas: list[dict], stale: set[str]) -> bool:
    """Valida e, se tudo estiver certo, troca o conteúdo de out_dir de forma atômica."""
    out_dir = Path(out_dir)
    meta = out_dir / "meta.json"
    anterior = json.loads(meta.read_text()) if meta.exists() else None
    erros = validar(con, anterior)
    if erros:
        for e in erros:
            log.error("validação: %s", e)
        return False
    novo, velho = out_dir.with_name(out_dir.name + ".novo"), out_dir.with_name(out_dir.name + ".velho")
    shutil.rmtree(novo, ignore_errors=True)
    exportar(con, novo, alertas, stale, anterior)
    shutil.rmtree(velho, ignore_errors=True)
    if out_dir.exists():
        out_dir.rename(velho)
    novo.rename(out_dir)
    shutil.rmtree(velho, ignore_errors=True)
    return True


def _opcional(client: Client, fonte: str, fn, ddl_vazio: str | None, con, depois=None) -> None:
    try:
        fn()
    except Exception:
        log.exception("fonte complementar %s falhou; seguindo sem ela", fonte)
        client.stale_sources.add(fonte)
        if ddl_vazio:
            con.execute(ddl_vazio)
        if depois:
            depois()


def executar(anos: list[int], sem_cnpj: bool, offline: bool, out_dir: Path = OUT_DIR, cache_dir: Path = CACHE_DIR) -> bool:
    client = Client(cache_dir=cache_dir, offline=offline)
    con = db.connect()
    log.info("extraindo deputados")
    extract_deputados(client, con)
    log.info("extraindo CEAP %s", anos)
    extract_ceap(client, con, anos, cache_dir)
    marcar_passageiros(con)
    log.info("extraindo votações")
    extract_votacoes(client, con, anos, cache_dir)
    log.info("extraindo proposições")
    extract_proposicoes(client, con, anos, cache_dir)
    log.info("extraindo presenças")
    extract_presencas(client, con, INICIO_LEGISLATURA, cache_dir=cache_dir)
    # Fontes complementares: se o formato mudar ou a fonte falhar, o painel sai sem elas em vez de não sair.
    log.info("extraindo frequência com justificativas")
    _opcional(client, "SitCamaraWS", lambda: extract_frequencia(client, con, cache_dir=cache_dir),
              "CREATE OR REPLACE TABLE frequencia_dia (data DATE, deputado_id BIGINT, frequencia VARCHAR, justificativa VARCHAR)", con)
    log.info("extraindo equipe de gabinete")
    _opcional(client, "funcionarios", lambda: extract_gabinete(client, con, cache_dir=cache_dir),
              """CREATE OR REPLACE TABLE secretarios (deputado_id BIGINT, nome VARCHAR, cargo VARCHAR, nivel INTEGER,
                 salario_estimado DOUBLE, nomeacao DATE, inicio DATE)""", con)
    log.info("extraindo emendas parlamentares")
    _opcional(client, "dadosabertos-download.cgu.gov.br", lambda: extract_emendas(client, con, cache_dir=cache_dir),
              None, con, depois=lambda: criar_tabelas_emendas(con))
    if sem_cnpj:
        con.execute("""CREATE OR REPLACE TABLE fornecedores (cnpj VARCHAR, razao_social VARCHAR, nome_fantasia VARCHAR,
            abertura DATE, situacao VARCHAR, cnae VARCHAR, municipio VARCHAR, uf VARCHAR,
            socios STRUCT(nome VARCHAR, qualificacao VARCHAR, entrada DATE)[], capital_social DOUBLE, sem_dados BOOLEAN)""")
    else:
        log.info("enriquecendo CNPJs")
        enrich_cnpj(client, con, cache_dir=cache_dir)
    log.info("calculando indicadores, séries, rede e alertas")
    calcular_indicadores(con, INICIO_LEGISLATURA, date.today())
    gerar_series(con)
    gerar_rede(con)
    alertas = gerar_alertas(con)
    ok = publicar(con, out_dir, alertas, client.stale_sources)
    log.info("publicado" if ok else "validação falhou; saída anterior mantida")
    return ok


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(prog="monitora")
    sub = p.add_subparsers(dest="cmd", required=True)
    run = sub.add_parser("run", help="executa o pipeline completo")
    run.add_argument("--anos", type=lambda s: [int(x) for x in s.split(",")], default=ANOS)
    run.add_argument("--sem-cnpj", action="store_true", help="não consulta a Receita")
    run.add_argument("--offline", action="store_true", help="usa somente o cache local")
    fic = sub.add_parser("ficticio", help="gera dados FICTÍCIOS de demonstração para o site")
    fic.add_argument("--out", type=Path, default=OUT_DIR)
    fic.add_argument("--deputados", type=int, default=513)
    a = p.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    if a.cmd == "ficticio":
        from monitora.fixtures import gerar_ficticios
        shutil.rmtree(a.out, ignore_errors=True)
        gerar_ficticios(a.out, a.deputados)
        log.info("dados fictícios gravados em %s", a.out)
        return
    sys.exit(0 if executar(a.anos, a.sem_cnpj, a.offline) else 1)
