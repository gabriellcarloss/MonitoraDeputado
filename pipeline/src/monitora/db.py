"""Conexão DuckDB compartilhada pelo pipeline."""
from pathlib import Path

import duckdb


def connect(path: Path | None = None) -> duckdb.DuckDBPyConnection:
    return duckdb.connect(str(path) if path else ":memory:")
