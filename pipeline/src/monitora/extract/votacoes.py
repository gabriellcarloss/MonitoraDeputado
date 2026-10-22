"""Votações nominais, votos individuais e orientações de bancada."""
import logging
from pathlib import Path

import duckdb

from monitora.config import CACHE_DIR
from monitora.extract.arquivos import arquivo_anual, ler_csv
from monitora.http import Client

log = logging.getLogger(__name__)


def extract_votacoes(client: Client, con: duckdb.DuckDBPyConnection, anos: list[int], cache_dir: Path = CACHE_DIR) -> None:
    arq = {n: [arquivo_anual(client, n, a, cache_dir) for a in anos]
           for n in ("votacoes", "votacoesVotos", "votacoesOrientacoes", "votacoesProposicoes")}
    con.execute(f"""
    CREATE OR REPLACE TABLE votos AS
    SELECT idVotacao AS votacao_id, TRY_CAST(deputado_id AS BIGINT) AS deputado_id, trim(voto) AS voto,
           deputado_siglaPartido AS partido_na_data, TRY_CAST(substr(dataHoraVoto, 1, 10) AS DATE) AS data
    FROM {ler_csv(arq['votacoesVotos'])} WHERE TRY_CAST(deputado_id AS BIGINT) IS NOT NULL;

    CREATE OR REPLACE TABLE votacoes AS
    WITH props AS (
      SELECT idVotacao, min(TRY_CAST(proposicao_id AS BIGINT)) AS proposicao_id
      FROM {ler_csv(arq['votacoesProposicoes'])} GROUP BY 1)
    SELECT v.id, TRY_CAST(v.data AS DATE) AS data, v.siglaOrgao AS sigla_orgao, v.descricao,
           TRY_CAST(v.aprovacao AS INTEGER) AS aprovacao, p.proposicao_id,
           TRY_CAST(v.votosSim AS INTEGER) AS votos_sim, TRY_CAST(v.votosNao AS INTEGER) AS votos_nao,
           TRY_CAST(v.votosOutros AS INTEGER) AS votos_outros
    FROM {ler_csv(arq['votacoes'])} v LEFT JOIN props p ON p.idVotacao = v.id
    WHERE v.id IN (SELECT DISTINCT votacao_id FROM votos);

    DELETE FROM votos WHERE votacao_id NOT IN (SELECT id FROM votacoes);

    CREATE OR REPLACE TABLE orientacoes AS
    SELECT DISTINCT idVotacao AS votacao_id,
           CASE WHEN upper(siglaBancada) LIKE '%GOV%' THEN 'Governo' ELSE trim(siglaBancada) END AS bancada,
           trim(orientacao) AS orientacao
    FROM {ler_csv(arq['votacoesOrientacoes'])}
    WHERE idVotacao IN (SELECT id FROM votacoes);
    """)
    log.info("votações nominais: %d, votos: %d", *con.execute(
        "SELECT (SELECT count(*) FROM votacoes), (SELECT count(*) FROM votos)").fetchone())
