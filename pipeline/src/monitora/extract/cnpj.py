"""Dados cadastrais da Receita Federal para os fornecedores (Minha Receita, fallback BrasilAPI)."""
import json
import logging
import time
from pathlib import Path
from urllib.parse import urlparse

import duckdb
import httpx

from monitora import db
from monitora.config import BRASIL_API, CACHE_DIR, MINHA_RECEITA
from monitora.http import Client

log = logging.getLogger(__name__)

VALIDADE_S = 90 * 86400

_SCHEMA = """
CREATE OR REPLACE TABLE fornecedores (
  cnpj VARCHAR, razao_social VARCHAR, nome_fantasia VARCHAR, abertura DATE, situacao VARCHAR, cnae VARCHAR,
  municipio VARCHAR, uf VARCHAR, socios STRUCT(nome VARCHAR, qualificacao VARCHAR, entrada DATE)[],
  capital_social DOUBLE, sem_dados BOOLEAN)
"""


class _Indisponivel(Exception):
    pass


def _consultar(client: Client, cnpj: str) -> dict | None:
    """Dados da Receita; None se o CNPJ não existe nas duas fontes; _Indisponivel se houve erro de rede."""
    nao_encontrado = 0
    for url in (MINHA_RECEITA, BRASIL_API):
        try:
            return client.get_json(url.format(cnpj=cnpj))
        except httpx.HTTPStatusError as e:
            nao_encontrado += e.response.status_code in (400, 404)
        except httpx.HTTPError as e:
            log.debug("cnpj %s falhou em %s: %s", cnpj, url, e)
    if nao_encontrado == 2:
        return None
    raise _Indisponivel(cnpj)


def _linha(cnpj: str, d: dict | None) -> tuple:
    if not d:
        return (cnpj, None, None, None, None, None, None, None, [], None, True)
    socios = [{"nome": s.get("nome_socio"), "qualificacao": s.get("qualificacao_socio"),
               "entrada": s.get("data_entrada_sociedade") or None} for s in d.get("qsa") or []]
    return (cnpj, d.get("razao_social"), d.get("nome_fantasia") or None, d.get("data_inicio_atividade") or None,
            d.get("descricao_situacao_cadastral"), d.get("cnae_fiscal_descricao"), d.get("municipio"), d.get("uf"),
            socios, d.get("capital_social"), False)


def enrich_cnpj(client: Client, con: duckdb.DuckDBPyConnection, max_novos: int = 3000, cache_dir: Path = CACHE_DIR) -> None:
    pasta = cache_dir / "cnpj"
    pasta.mkdir(parents=True, exist_ok=True)
    cnpjs = [r[0] for r in con.execute("""
        SELECT cnpj_cpf FROM despesas WHERE length(cnpj_cpf) = 14 GROUP BY 1 ORDER BY sum(valor_liquido) DESC
    """).fetchall()]
    linhas, novos = [], 0
    for cnpj in cnpjs:
        arq = pasta / f"{cnpj}.json"
        cache = json.loads(arq.read_text()) if arq.exists() else None
        if cache and time.time() - cache["consultado_em"] < VALIDADE_S:
            linhas.append(_linha(cnpj, cache["dados"]))
            continue
        if novos >= max_novos:
            if cache:
                linhas.append(_linha(cnpj, cache["dados"]))
            continue
        novos += 1
        try:
            dados = _consultar(client, cnpj)
        except _Indisponivel:
            client.stale_sources.add(urlparse(MINHA_RECEITA).hostname)
            if cache:
                linhas.append(_linha(cnpj, cache["dados"]))
            continue
        arq.write_text(json.dumps({"consultado_em": time.time(), "dados": dados}, ensure_ascii=False))
        linhas.append(_linha(cnpj, dados))
    con.execute(_SCHEMA)
    db.inserir(con, "fornecedores", linhas)
    log.info("fornecedores: %d (%d consultas novas)", len(linhas), novos)
