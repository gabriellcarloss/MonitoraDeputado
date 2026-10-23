"""Emendas parlamentares (Portal da Transparência / CGU): valores por emenda e por favorecido.

O arquivo identifica o autor só pelo nome. A emenda é atribuída ao deputado quando o nome do autor coincide
com o nome parlamentar de um único deputado do painel (emendas de bancada, comissão e relator não casam com
ninguém e ficam de fora). Considera emendas a partir do orçamento de 2024, o primeiro feito por esta legislatura.
"""
import io
import logging
import re
import shutil
import zipfile
from pathlib import Path

import duckdb
import httpx

from monitora import db
from monitora.config import ANO_INICIAL_EMENDAS, CACHE_DIR, EMENDAS_URL, UF_POR_NOME
from monitora.http import Client
from monitora.normalize import nome as normalizar

log = logging.getLogger(__name__)

# coluna lógica → nome no arquivo (comparado sem acentos e sem diferença de maiúsculas)
COLS_EMENDAS = {
    "codigo": "Código da Emenda", "ano": "Ano da Emenda", "tipo": "Tipo de Emenda", "autor": "Nome do Autor da Emenda",
    "localidade": "Localidade de aplicação do recurso", "municipio": "Município", "uf": "UF", "funcao": "Nome Função",
    "empenhado": "Valor Empenhado", "liquidado": "Valor Liquidado", "pago": "Valor Pago",
    "restos_pagos": "Valor Restos A Pagar Pagos",
}
COLS_FAVORECIDOS = {
    "codigo": "Código da Emenda", "autor": "Nome do Autor da Emenda", "ano_mes": "Ano/Mês", "favorecido": "Favorecido",
    "codigo_favorecido": "Código do Favorecido", "natureza": "Natureza Jurídica", "tipo_favorecido": "Tipo Favorecido",
    "uf": "UF Favorecido", "municipio": "Município Favorecido", "valor": "Valor Recebido",
}
OPCIONAIS = {"restos_pagos", "localidade", "funcao", "natureza", "tipo_favorecido", "codigo_favorecido", "municipio", "liquidado"}


def chave_nome(s: str | None) -> str:
    """Nome comparável: sem acento, sem pontuação ('PR. MARCO FELICIANO' → 'PR MARCO FELICIANO')."""
    return re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9 ]", " ", normalizar(s))).strip()


def uf_sigla(v: str | None) -> str | None:
    s = normalizar(v)
    if len(s) == 2 and s in UF_POR_NOME.values():
        return s
    return UF_POR_NOME.get(s)


def _para_utf8(origem: zipfile.ZipFile, membro: str, destino: Path) -> None:
    """Os CSV da CGU vêm em Latin-1; o DuckDB lê UTF-8."""
    with origem.open(membro) as f:
        inicio = f.read(200_000)
    try:
        inicio[:-4].decode("utf-8")
        cod = "utf-8-sig" if any(b > 127 for b in inicio) else "latin-1"
    except UnicodeDecodeError:
        cod = "latin-1"
    with origem.open(membro) as bruto, open(destino, "w", encoding="utf-8") as saida:
        shutil.copyfileobj(io.TextIOWrapper(bruto, encoding=cod, newline=""), saida)


def _colunas(con, arquivo: Path, esperadas: dict[str, str]) -> dict[str, str] | None:
    cabecalho = [c[0] for c in con.execute(f"DESCRIBE SELECT * FROM {_ler(arquivo)}").fetchall()]
    por_chave = {normalizar(c): c for c in cabecalho}
    out = {}
    for logico, nome in esperadas.items():
        real = por_chave.get(normalizar(nome))
        if real is None and logico not in OPCIONAIS:
            log.error("emendas: coluna obrigatória ausente em %s: %r (cabeçalho: %s)", arquivo.name, nome, cabecalho)
            return None
        out[logico] = real
    return out


def _ler(arquivo: Path) -> str:
    return f"read_csv('{arquivo}', delim=';', header=true, all_varchar=true, quote='\"')"


def _num(col: str | None) -> str:
    """Valor em formato brasileiro ('1.234,56') → DOUBLE."""
    if not col:
        return "0.0"
    return f"coalesce(TRY_CAST(replace(replace(\"{col}\", '.', ''), ',', '.') AS DOUBLE), 0.0)"


def _txt(col: str | None) -> str:
    return f"nullif(trim(\"{col}\"), '')" if col else "NULL"


def criar_tabelas(con: duckdb.DuckDBPyConnection) -> None:
    con.execute("""
    CREATE OR REPLACE TABLE emendas (codigo VARCHAR, ano INTEGER, tipo VARCHAR, deputado_id BIGINT, autor VARCHAR,
      localidade VARCHAR, municipio VARCHAR, uf VARCHAR, funcao VARCHAR, empenhado DOUBLE, liquidado DOUBLE, pago DOUBLE,
      restos_pagos DOUBLE, pix BOOLEAN);
    CREATE OR REPLACE TABLE emendas_favorecidos (codigo VARCHAR, deputado_id BIGINT, ano_mes VARCHAR, favorecido VARCHAR,
      codigo_favorecido VARCHAR, natureza VARCHAR, tipo_favorecido VARCHAR, uf VARCHAR, municipio VARCHAR, valor DOUBLE);
    """)


def carregar_emendas(con: duckdb.DuckDBPyConnection, principal: Path, favorecidos: Path | None) -> None:
    """Lê os CSV (já em UTF-8) e grava emendas/emendas_favorecidos atribuídas a deputados do painel."""
    criar_tabelas(con)
    c = _colunas(con, principal, COLS_EMENDAS)
    if c is None:
        return
    autores = {}
    for id_, nome in con.execute("SELECT id, nome FROM deputados").fetchall():
        k = chave_nome(nome)
        autores[k] = None if k in autores else id_
    distintos = [r[0] for r in con.execute(f"SELECT DISTINCT \"{c['autor']}\" FROM {_ler(principal)}").fetchall()]
    mapa = [(a, autores.get(chave_nome(a))) for a in distintos if a and autores.get(chave_nome(a))]
    con.execute("CREATE OR REPLACE TEMP TABLE _autor (autor VARCHAR, deputado_id BIGINT)")
    db.inserir(con, "_autor", mapa)
    con.execute(f"""
    INSERT INTO emendas
    SELECT {_txt(c['codigo'])}, TRY_CAST("{c['ano']}" AS INTEGER), {_txt(c['tipo'])}, a.deputado_id, a.autor,
           {_txt(c['localidade'])}, {_txt(c['municipio'])}, {_txt(c['uf'])}, {_txt(c['funcao'])},
           {_num(c['empenhado'])}, {_num(c['liquidado'])}, {_num(c['pago'])}, {_num(c['restos_pagos'])},
           coalesce(regexp_matches(lower("{c['tipo']}"), 'transfer.ncias? especia'), false)
    FROM {_ler(principal)} e JOIN _autor a ON a.autor = e."{c['autor']}"
    WHERE TRY_CAST("{c['ano']}" AS INTEGER) >= {ANO_INICIAL_EMENDAS}
    """)
    # UF por extenso → sigla (feito em Python para não depender de acentos no SQL)
    ufs = {u: uf_sigla(u) for (u,) in con.execute("SELECT DISTINCT uf FROM emendas WHERE uf IS NOT NULL").fetchall()}
    for original, sigla in ufs.items():
        con.execute("UPDATE emendas SET uf = ? WHERE uf = ?", [sigla, original])

    if favorecidos:
        f = _colunas(con, favorecidos, COLS_FAVORECIDOS)
        if f is not None:
            con.execute(f"""
            INSERT INTO emendas_favorecidos
            SELECT x.codigo, x.deputado_id, {_txt(f['ano_mes'])}, {_txt(f['favorecido'])}, {_txt(f['codigo_favorecido'])},
                   {_txt(f['natureza'])}, {_txt(f['tipo_favorecido'])}, {_txt(f['uf'])}, {_txt(f['municipio'])}, {_num(f['valor'])}
            FROM {_ler(favorecidos)} v
            JOIN (SELECT DISTINCT codigo, deputado_id FROM emendas) x ON x.codigo = trim(v."{f['codigo']}")
            """)
    n = con.execute("SELECT count(*), count(DISTINCT deputado_id) FROM emendas").fetchone()
    log.info("emendas: %d atribuídas a %d deputados; %d pagamentos a favorecidos", n[0], n[1],
             con.execute("SELECT count(*) FROM emendas_favorecidos").fetchone()[0])


def extract_emendas(client: Client, con: duckdb.DuckDBPyConnection, cache_dir: Path = CACHE_DIR) -> None:
    criar_tabelas(con)
    try:
        zip_path = client.download(EMENDAS_URL, cache_dir / "arquivos" / "emendas.zip", max_age_hours=20)
    except httpx.HTTPError as e:
        log.warning("emendas indisponíveis (%s); seção de emendas fica vazia", e)
        client.stale_sources.add("dadosabertos-download.cgu.gov.br")
        return
    pasta = cache_dir / "emendas"
    pasta.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(zip_path) as z:
            csvs = [n for n in z.namelist() if n.lower().endswith(".csv")]
            fav = next((n for n in csvs if "favorecido" in n.lower()), None)
            princ = next((n for n in csvs if n != fav and "emenda" in n.lower() and "convenio" not in n.lower()), None)
            if not princ:
                log.error("emendas: CSV principal não encontrado no ZIP (%s)", csvs)
                return
            _para_utf8(z, princ, pasta / "emendas.csv")
            if fav:
                _para_utf8(z, fav, pasta / "favorecidos.csv")
    except zipfile.BadZipFile as e:
        log.error("emendas: ZIP inválido (%s)", e)
        client.stale_sources.add("dadosabertos-download.cgu.gov.br")
        return
    carregar_emendas(con, pasta / "emendas.csv", (pasta / "favorecidos.csv") if fav else None)
