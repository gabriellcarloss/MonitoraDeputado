"""Conexão DuckDB compartilhada pelo pipeline."""
from pathlib import Path

import duckdb


def connect(path: Path | None = None) -> duckdb.DuckDBPyConnection:
    return duckdb.connect(str(path) if path else ":memory:")


def inserir(con: duckdb.DuckDBPyConnection, tabela: str, linhas: list[tuple]) -> None:
    """Insere muitas linhas de uma vez via arquivo JSON temporário (executemany é lento no DuckDB)."""
    import json
    import tempfile

    if not linhas:
        return
    desc = con.execute(f"DESCRIBE {tabela}").fetchall()
    cols = [r[0] for r in desc]
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        for linha in linhas:
            f.write(json.dumps(dict(zip(cols, linha)), ensure_ascii=False, default=str) + "\n")
    tipos = ", ".join(f"'{r[0]}': '{r[1]}'" for r in desc)
    con.execute(f"INSERT INTO {tabela} SELECT * FROM read_json('{f.name}', format='newline_delimited', columns={{{tipos}}})")
    Path(f.name).unlink()
