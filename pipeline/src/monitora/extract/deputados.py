"""Deputados da legislatura, períodos de exercício e histórico partidário (API v2)."""
import json
import logging

import duckdb

from monitora.config import API, LEGISLATURA
from monitora.http import Client

log = logging.getLogger(__name__)

_SCHEMA = """
CREATE OR REPLACE TABLE deputados (
  id BIGINT PRIMARY KEY, nome VARCHAR, nome_civil VARCHAR, sexo VARCHAR, uf VARCHAR, partido_atual VARCHAR,
  foto VARCHAR, email VARCHAR, gabinete VARCHAR, redes VARCHAR[], escolaridade VARCHAR, nascimento DATE,
  situacao VARCHAR, condicao_eleitoral VARCHAR, inicio_exercicio DATE, fim_exercicio DATE);
CREATE OR REPLACE TABLE exercicios (deputado_id BIGINT, inicio DATE, fim DATE);
CREATE OR REPLACE TABLE deputado_partidos (deputado_id BIGINT, partido VARCHAR, inicio DATE, fim DATE);
"""


def _periodos_exercicio(hist: list[dict]) -> list[tuple[str, str | None]]:
    periodos, inicio = [], None
    for ev in hist:
        dia = ev["dataHora"][:10]
        if ev.get("situacao") == "Exercício":
            inicio = inicio or dia
        elif inicio:
            periodos.append((inicio, dia))
            inicio = None
    if inicio:
        periodos.append((inicio, None))
    return periodos


def _periodos_partido(hist: list[dict]) -> list[tuple[str, str, str | None]]:
    periodos: list[list] = []
    for ev in hist:
        sigla, dia = ev.get("siglaPartido"), ev["dataHora"][:10]
        if not sigla:
            continue
        if periodos and periodos[-1][0] == sigla:
            continue
        if periodos:
            periodos[-1][2] = dia
        periodos.append([sigla, dia, None])
    return [tuple(p) for p in periodos]


def extract_deputados(client: Client, con: duckdb.DuckDBPyConnection) -> None:
    con.execute(_SCHEMA)
    lista = client.get_all_pages(f"{API}/deputados", {"idLegislatura": LEGISLATURA, "itens": 100})
    vistos = set()
    for item in lista:
        id_ = item["id"]
        if id_ in vistos:
            continue
        vistos.add(id_)
        d = client.get_json(f"{API}/deputados/{id_}")["dados"]
        st = d.get("ultimoStatus") or {}
        hist = sorted(
            (h for h in client.get_json(f"{API}/deputados/{id_}/historico")["dados"] if h.get("idLegislatura") == LEGISLATURA),
            key=lambda h: h["dataHora"],
        )
        exerc = _periodos_exercicio(hist)
        con.executemany("INSERT INTO exercicios VALUES (?, ?, ?)", [(id_, i, f) for i, f in exerc])
        con.executemany("INSERT INTO deputado_partidos VALUES (?, ?, ?, ?)", [(id_, *p) for p in _periodos_partido(hist)])
        con.execute(
            "INSERT INTO deputados VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [id_, st.get("nome") or item.get("nome"), d.get("nomeCivil"), d.get("sexo"), st.get("siglaUf") or item.get("siglaUf"),
             st.get("siglaPartido") or item.get("siglaPartido"), st.get("urlFoto"), st.get("email"),
             json.dumps(st.get("gabinete") or {}, ensure_ascii=False), d.get("redeSocial") or [], d.get("escolaridade"),
             d.get("dataNascimento"), st.get("situacao"), st.get("condicaoEleitoral"),
             exerc[0][0] if exerc else None, exerc[-1][1] if exerc else None],
        )
    log.info("deputados: %d", len(vistos))
