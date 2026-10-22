"""Proposições apresentadas, autorias e relatorias."""
import logging
from pathlib import Path

import duckdb

from monitora.config import CACHE_DIR, TIPOS_RELEVANTES
from monitora.extract.arquivos import arquivo_anual, ler_csv
from monitora.http import Client

log = logging.getLogger(__name__)


def extract_proposicoes(client: Client, con: duckdb.DuckDBPyConnection, anos: list[int], cache_dir: Path = CACHE_DIR) -> None:
    arq = {n: [arquivo_anual(client, n, a, cache_dir) for a in anos]
           for n in ("proposicoes", "proposicoesAutores", "proposicoesTemas")}
    con.execute(f"""
    CREATE OR REPLACE TABLE proposicoes AS
    WITH temas AS (
      SELECT TRY_CAST(regexp_extract(uriProposicao, '(\\d+)$', 1) AS BIGINT) AS id, min(tema) AS tema
      FROM {ler_csv(arq['proposicoesTemas'])} GROUP BY 1)
    SELECT TRY_CAST(p.id AS BIGINT) AS id, p.siglaTipo AS sigla_tipo, TRY_CAST(p.numero AS INTEGER) AS numero,
           TRY_CAST(p.ano AS INTEGER) AS ano, p.ementa, t.tema,
           TRY_CAST(substr(p.dataApresentacao, 1, 10) AS DATE) AS data_apresentacao,
           nullif(p.ultimoStatus_descricaoSituacao, '') AS situacao,
           p.siglaTipo IN {TIPOS_RELEVANTES!r} AS relevante,
           nullif(p.urlInteiroTeor, '') AS url_inteiro_teor,
           TRY_CAST(regexp_extract(p.ultimoStatus_uriRelator, '(\\d+)$', 1) AS BIGINT) AS _relator,
           nullif(p.ultimoStatus_siglaOrgao, '') AS _orgao
    FROM {ler_csv(arq['proposicoes'])} p LEFT JOIN temas t ON t.id = TRY_CAST(p.id AS BIGINT);

    CREATE OR REPLACE TABLE relatorias AS
    SELECT id AS proposicao_id, _relator AS deputado_id, _orgao AS orgao FROM proposicoes WHERE _relator IS NOT NULL;
    ALTER TABLE proposicoes DROP COLUMN _relator;
    ALTER TABLE proposicoes DROP COLUMN _orgao;

    CREATE OR REPLACE TABLE autorias AS
    SELECT DISTINCT TRY_CAST(idProposicao AS BIGINT) AS proposicao_id, TRY_CAST(idDeputadoAutor AS BIGINT) AS deputado_id,
           TRY_CAST(ordemAssinatura AS INTEGER) = 1 AS proponente_principal, TRY_CAST(ordemAssinatura AS INTEGER) AS ordem
    FROM {ler_csv(arq['proposicoesAutores'])}
    WHERE TRY_CAST(idDeputadoAutor AS BIGINT) IS NOT NULL;
    """)
    log.info("proposições: %d", con.execute("SELECT count(*) FROM proposicoes").fetchone()[0])
