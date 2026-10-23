"""Séries mensais por escopo (Brasil, UF, partido, deputado, fornecedor) e detecção de picos."""
import statistics
from datetime import date

import duckdb

ESCALA_MAD = 1.4826  # torna o MAD comparável ao desvio padrão em dados normais


def detectar_picos(pontos: list[tuple[str, float]]) -> list[dict]:
    """Pico: valor > mediana + 3×MAD (escalado) OU > 2,5× a média dos 12 meses anteriores (com ≥ 6 anteriores)."""
    if not pontos:
        return []
    valores = [v for _, v in pontos]
    med = statistics.median(valores)
    mad = ESCALA_MAD * statistics.median(abs(v - med) for v in valores)
    picos = []
    for i, (periodo, v) in enumerate(pontos):
        if v <= 0:
            continue
        ant = valores[max(0, i - 12):i]
        media_ant = sum(ant) / len(ant) if len(ant) >= 6 else 0
        por_mad = mad > 0 and v > med + 3 * mad
        por_media = media_ant > 0 and v > 2.5 * media_ant
        if not (por_mad or por_media):
            continue
        base = media_ant if media_ant > 0 else med
        fator = round(v / base, 1) if base > 0 else None
        rotulo = f"pico: {fator:.1f}× a média".replace(".", ",") if fator else "pico"
        picos.append({"periodo": periodo, "valor": v, "fator": fator, "rotulo": rotulo})
    return picos


# (métrica, escopo, chave SQL, valor SQL, FROM/JOIN, coluna de período, preencher zeros)
_GASTO = "despesas e JOIN deputados d ON d.id = e.deputado_id"
_PROPS = ("autorias a JOIN proposicoes p ON p.id = a.proposicao_id AND p.relevante AND a.proponente_principal "
          "JOIN deputados d ON d.id = a.deputado_id")
# Ausências justificadas (registro oficial de frequência) saem da conta, como no indicador de presença.
_PRES = ("(SELECT p0.* FROM presencas p0 JOIN sessoes s0 ON s0.id = p0.sessao_id "
         "WHERE p0.presente OR NOT EXISTS (SELECT 1 FROM frequencia_dia f WHERE f.data = s0.data "
         "AND f.deputado_id = p0.deputado_id AND lower(f.frequencia) LIKE 'aus%ncia justificada')) pr "
         "JOIN sessoes s ON s.id = pr.sessao_id JOIN deputados d ON d.id = pr.deputado_id")
_DEF = []
for escopo, chave in (("brasil", "'BR'"), ("uf", "d.uf"), ("partido", "d.partido_atual"), ("deputado", "d.id::VARCHAR")):
    _DEF += [
        ("gasto", escopo, chave, "sum(e.valor_liquido)", _GASTO, "e.ano_mes", True),
        ("proposicoes", escopo, chave, "count(*)", _PROPS, "strftime(p.data_apresentacao, '%Y-%m')", True),
        ("presenca", escopo, chave, "avg(pr.presente::INT)", _PRES, "strftime(s.data, '%Y-%m')", False),
    ]
_DEF += [
    ("gasto", "fornecedor", "e.cnpj_cpf", "sum(e.valor_liquido)", "despesas e", "e.ano_mes", True),
    ("votacoes", "brasil", "'BR'", "count(*)", "votacoes v", "strftime(v.data, '%Y-%m')", True),
    ("votacoes", "deputado", "vt.deputado_id::VARCHAR", "count(*)", "votos vt JOIN votacoes v ON v.id = vt.votacao_id",
     "strftime(v.data, '%Y-%m')", True),
    ("votacoes_semana", "brasil", "'BR'", "count(*)", "votacoes v", "strftime(date_trunc('week', v.data), '%Y-%m-%d')", False),
]


def gerar_series(con: duckdb.DuckDBPyConnection) -> None:
    brutos = " UNION ALL ".join(
        f"SELECT '{m}' AS metrica, '{esc}' AS escopo, {ch} AS chave, {per} AS periodo, {val}::DOUBLE AS valor, {str(z).lower()} AS zero "
        f"FROM {frm} WHERE {ch} IS NOT NULL AND {per} IS NOT NULL GROUP BY ALL"
        for m, esc, ch, val, frm, per, z in _DEF)
    con.execute(f"""
    CREATE OR REPLACE TABLE series AS
    WITH brutos AS ({brutos}),
    limites AS (SELECT metrica, escopo, chave, min(periodo) AS a, max(periodo) AS b FROM brutos WHERE zero GROUP BY ALL),
    meses AS (SELECT strftime(m, '%Y-%m') AS periodo
              FROM generate_series(DATE '2019-01-01', DATE '{date.today():%Y-%m-01}', INTERVAL 1 MONTH) t(m)),
    preenchidos AS (
      SELECT l.metrica, l.escopo, l.chave, m.periodo, coalesce(b.valor, 0) AS valor
      FROM limites l JOIN meses m ON m.periodo BETWEEN l.a AND l.b
      LEFT JOIN brutos b USING (metrica, escopo, chave, periodo))
    SELECT * FROM preenchidos
    UNION ALL SELECT metrica, escopo, chave, periodo, valor FROM brutos WHERE NOT zero
    """)


def series_de(con: duckdb.DuckDBPyConnection, escopo: str, chave: str) -> list[dict]:
    rows = con.execute("SELECT metrica, periodo, valor FROM series WHERE escopo = ? AND chave = ? ORDER BY metrica, periodo",
                       [escopo, chave]).fetchall()
    por_metrica: dict[str, list] = {}
    for m, per, v in rows:
        por_metrica.setdefault(m, []).append((per, v))
    return [{"metrica": m, "pontos": [{"periodo": p, "valor": v} for p, v in pts], "picos": detectar_picos(pts)}
            for m, pts in por_metrica.items()]
