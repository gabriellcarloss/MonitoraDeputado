"""Cota para o Exercício da Atividade Parlamentar (CEAP): uma linha por documento fiscal."""
import logging
import zipfile
from datetime import date
from pathlib import Path

import duckdb

from monitora import db
from monitora.config import CACHE_DIR, CEAP_URL
from monitora.http import Client

log = logging.getLogger(__name__)


def _num(col: str) -> str:
    """Converte texto em DOUBLE aceitando '1.234,56' e '1234.56'."""
    return (f"TRY_CAST(CASE WHEN contains({col}, ',') THEN replace(replace({col}, '.', ''), ',', '.') "
            f"ELSE {col} END AS DOUBLE)")


def _csv(client: Client, ano: int, cache_dir: Path) -> Path:
    max_age = 20 if ano >= date.today().year else 24 * 30
    zip_path = client.download(CEAP_URL.format(ano=ano), cache_dir / "ceap" / f"Ano-{ano}.csv.zip", max_age_hours=max_age)
    csv_path = zip_path.with_suffix("")
    if not csv_path.exists() or csv_path.stat().st_mtime < zip_path.stat().st_mtime:
        with zipfile.ZipFile(zip_path) as z:
            nome = next(n for n in z.namelist() if n.lower().endswith(".csv"))
            csv_path.write_bytes(z.read(nome))
    return csv_path


def extract_ceap(client: Client, con: duckdb.DuckDBPyConnection, anos: list[int], cache_dir: Path = CACHE_DIR) -> None:
    arquivos = [str(_csv(client, ano, cache_dir)) for ano in anos]
    con.execute(f"""
    CREATE OR REPLACE TABLE despesas AS
    SELECT
      TRY_CAST(ideDocumento AS BIGINT) AS ide_documento,
      TRY_CAST(ideCadastro AS BIGINT) AS deputado_id,
      TRY_CAST(substr(datEmissao, 1, 10) AS DATE) AS data,
      numAno || '-' || lpad(numMes, 2, '0') AS ano_mes,
      trim(txtDescricao) AS categoria,
      nullif(trim(txtDescricaoEspecificacao), '') AS especificacao,
      trim(txtFornecedor) AS fornecedor,
      CASE WHEN length(regexp_replace(txtCNPJCPF, '\\D', '', 'g')) IN (11, 14)
           THEN regexp_replace(txtCNPJCPF, '\\D', '', 'g') END AS cnpj_cpf,
      nullif(trim(txtNumero), '') AS numero_documento,
      {_num('vlrDocumento')} AS valor_documento,
      coalesce({_num('vlrGlosa')}, 0) AS valor_glosa,
      {_num('vlrLiquido')} AS valor_liquido,
      nullif(trim(txtPassageiro), '') AS passageiro,
      nullif(trim(txtTrecho), '') AS trecho,
      nullif(trim(urlDocumento), '') AS url_documento,
      CAST(NULL AS BOOLEAN) AS passageiro_e_deputado
    FROM read_csv({arquivos!r}, delim=';', header=true, all_varchar=true, quote='"', union_by_name=true)
    WHERE TRY_CAST(ideCadastro AS BIGINT) IS NOT NULL
    """)
    log.info("despesas: %d", con.execute("SELECT count(*) FROM despesas").fetchone()[0])


def marcar_passageiros(con: duckdb.DuckDBPyConnection) -> None:
    """Preenche despesas.passageiro_e_deputado comparando com nome parlamentar e nome civil."""
    from monitora.normalize import mesmo_nome

    pares = con.execute("""
        SELECT DISTINCT e.deputado_id, e.passageiro, d.nome, d.nome_civil
        FROM despesas e JOIN deputados d ON d.id = e.deputado_id WHERE e.passageiro IS NOT NULL
    """).fetchall()
    con.execute("CREATE OR REPLACE TEMP TABLE _pass (deputado_id BIGINT, passageiro VARCHAR, eh BOOLEAN)")
    db.inserir(con, "_pass", [(dep, p, mesmo_nome(p, n) or mesmo_nome(p, c)) for dep, p, n, c in pares])
    con.execute("""
        UPDATE despesas SET passageiro_e_deputado = _pass.eh FROM _pass
        WHERE _pass.deputado_id = despesas.deputado_id AND _pass.passageiro = despesas.passageiro
    """)
    con.execute("DROP TABLE _pass")
