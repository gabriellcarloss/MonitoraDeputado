"""Votações nominais, votos individuais e orientações de bancada."""
import logging
import re
import unicodedata
from pathlib import Path

import duckdb

from monitora import db
from monitora.config import CACHE_DIR
from monitora.extract.arquivos import anuais, ler_csv
from monitora.http import Client
from monitora.normalize import nome

log = logging.getLogger(__name__)


def extract_votacoes(client: Client, con: duckdb.DuckDBPyConnection, anos: list[int], cache_dir: Path = CACHE_DIR) -> None:
    arq = {n: anuais(client, n, anos, cache_dir)
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
    resolver_orientacoes(con)
    log.info("votações nominais: %d, votos: %d", *con.execute(
        "SELECT (SELECT count(*) FROM votacoes), (SELECT count(*) FROM votos)").fetchone())


_NAO_PARTIDARIAS = {"GOVERNO", "MAIORIA", "MINORIA", "OPOSICAO"}


def _norm_sigla(s: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", nome(s))


def _tokens_bancada(bancada: str) -> set[str]:
    """Siglas contidas no nome de uma bancada: 'Fdr PT-PCdoB-PV', 'Bl UniãoPpPdtPsb'…"""
    sem_acento = unicodedata.normalize("NFKD", bancada).encode("ascii", "ignore").decode()
    tokens = set()
    for parte in re.split(r"[^A-Za-z0-9]+", sem_acento):
        if not parte:
            continue
        tokens.add(parte.upper())
        tokens |= {t.upper() for t in re.findall(r"[A-Z][a-z0-9]+|[A-Z]+(?![a-z])", parte)}
    return tokens


def resolver_orientacoes(con: duckdb.DuckDBPyConnection) -> None:
    """Tabela orientacao_partido: para cada votação e partido com votos, a orientação que vale para ele —
    a do próprio partido; senão a da federação/bloco que o contém (a bancada mais específica)."""
    bancadas: dict[str, list[tuple[str, str]]] = {}
    for vid, b, o in con.execute("SELECT votacao_id, bancada, orientacao FROM orientacoes").fetchall():
        bancadas.setdefault(vid, []).append((b, o))
    linhas = []
    for vid, partido in con.execute("SELECT DISTINCT votacao_id, partido_na_data FROM votos WHERE partido_na_data IS NOT NULL").fetchall():
        alvo = _norm_sigla(partido)
        candidatas = []
        for b, o in bancadas.get(vid, []):
            nb = _norm_sigla(b)
            if nb in _NAO_PARTIDARIAS:
                continue
            if nb == alvo:
                candidatas = [(0, b, o)]
                break
            toks = _tokens_bancada(b)
            if alvo in toks:
                candidatas.append((len(toks), b, o))
        if candidatas:
            _, b, o = min(candidatas)
            linhas.append((vid, partido, o, b))
    con.execute("CREATE OR REPLACE TABLE orientacao_partido (votacao_id VARCHAR, partido VARCHAR, orientacao VARCHAR, bancada VARCHAR)")
    db.inserir(con, "orientacao_partido", linhas)
