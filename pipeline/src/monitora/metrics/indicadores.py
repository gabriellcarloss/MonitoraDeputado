"""Indicadores de custo, entrega, presença e comportamento por deputado, com rankings e agregados."""
from datetime import date

import duckdb

from monitora import db
from monitora.config import COTA_MENSAL_UF, TIPOS_REQUERIMENTO

# Indicadores em que o menor valor ocupa a posição 1.
MENOR_MELHOR = {"gasto_total", "gasto_medio_mensal", "pct_cota_usada", "pct_maior_fornecedor",
                "custo_por_proposicao", "custo_por_sessao", "n_votos_contra_bancada", "n_faltas_sem_justificativa"}

INDICADORES = ["gasto_total", "gasto_medio_mensal", "pct_cota_usada", "pct_maior_fornecedor", "n_proposicoes_relevantes",
               "n_proposicoes_coautor", "n_requerimentos", "n_relatorias", "n_aprovadas", "pct_presenca_sessoes",
               "pct_participacao_votacoes", "pct_alinhamento_partido", "pct_alinhamento_governo",
               "n_votos_contra_bancada", "custo_por_proposicao", "custo_por_sessao", "n_faltas_sem_justificativa"]
# Ausências justificadas (licença médica, missão autorizada…) não são boas nem ruins: aparecem, mas sem ranking.


def calcular_indicadores(con: duckdb.DuckDBPyConnection, inicio: date, fim: date) -> None:
    con.execute("CREATE OR REPLACE TEMP TABLE _cota (uf VARCHAR, valor DOUBLE)")
    db.inserir(con, "_cota", list(COTA_MENSAL_UF.items()))
    p = {"ini": inicio, "fim": fim, "mi": inicio.strftime("%Y-%m"), "mf": fim.strftime("%Y-%m"),
         "hoje": min(date.today(), fim)}
    con.execute(f"""
    CREATE OR REPLACE TABLE indicadores AS
    WITH
    exerc AS (  -- dias de exercício dentro do período, por intervalo
      SELECT deputado_id, greatest(inicio, $ini) AS ini, least(coalesce(fim, $hoje + 1), $fim + 1) AS fim
      FROM exercicios),
    meses AS (
      SELECT deputado_id, sum(greatest(datediff('day', ini, fim), 0)) / 30.4375 AS meses_exercicio FROM exerc GROUP BY 1),
    gastos AS (
      SELECT deputado_id, sum(valor_liquido) AS gasto_total FROM despesas WHERE ano_mes BETWEEN $mi AND $mf GROUP BY 1),
    por_forn AS (
      SELECT deputado_id, coalesce(cnpj_cpf, fornecedor) AS f, sum(valor_liquido) AS v
      FROM despesas WHERE ano_mes BETWEEN $mi AND $mf GROUP BY 1, 2),
    maior_forn AS (SELECT deputado_id, max(v) AS v FROM por_forn GROUP BY 1),
    props AS (
      SELECT a.deputado_id,
        count(*) FILTER (p.relevante AND a.proponente_principal) AS n_proposicoes_relevantes,
        count(*) FILTER (p.relevante AND NOT a.proponente_principal) AS n_proposicoes_coautor,
        count(*) FILTER (p.sigla_tipo IN {TIPOS_REQUERIMENTO!r} AND a.proponente_principal) AS n_requerimentos,
        count(*) FILTER (p.relevante AND a.proponente_principal AND p.situacao ILIKE '%transformad%norma%') AS n_aprovadas
      FROM autorias a JOIN proposicoes p ON p.id = a.proposicao_id
      WHERE p.data_apresentacao BETWEEN $ini AND $fim GROUP BY 1),
    relat AS (
      SELECT r.deputado_id, count(DISTINCT r.proposicao_id) AS n_relatorias
      FROM relatorias r JOIN proposicoes p ON p.id = r.proposicao_id
      WHERE p.data_apresentacao BETWEEN $ini AND $fim GROUP BY 1),
    justif AS (  -- dias com ausência justificada no registro oficial de frequência
      SELECT DISTINCT data, deputado_id FROM frequencia_dia WHERE lower(frequencia) LIKE 'aus%ncia justificada'),
    pres AS (
      SELECT pr.deputado_id,
        count(*) FILTER (pr.presente) AS n_presente,
        count(*) FILTER (NOT pr.presente AND j.deputado_id IS NOT NULL) AS n_justificadas,
        count(*) AS n_sessoes
      FROM presencas pr JOIN sessoes s ON s.id = pr.sessao_id
      LEFT JOIN justif j ON j.data = s.data AND j.deputado_id = pr.deputado_id
      WHERE s.data BETWEEN $ini AND $fim GROUP BY 1),
    plen AS (
      SELECT e.deputado_id, v.id AS votacao_id FROM votacoes v
      JOIN exerc e ON v.data >= e.ini AND v.data < e.fim
      WHERE v.sigla_orgao = 'PLEN' AND v.data BETWEEN $ini AND $fim),
    part AS (
      SELECT pl.deputado_id,
        avg((vt.voto IS NOT NULL AND vt.voto <> 'Artigo 17')::INT) AS pct_participacao_votacoes
      FROM plen pl LEFT JOIN votos vt ON vt.votacao_id = pl.votacao_id AND vt.deputado_id = pl.deputado_id GROUP BY 1),
    votos_periodo AS (
      SELECT vt.* FROM votos vt JOIN votacoes v ON v.id = vt.votacao_id WHERE v.data BETWEEN $ini AND $fim),
    alin_partido AS (
      SELECT vt.deputado_id, avg((vt.voto = o.orientacao)::INT) AS pct_alinhamento_partido,
             count(*) FILTER (vt.voto <> o.orientacao) AS n_votos_contra_bancada
      FROM votos_periodo vt JOIN orientacao_partido o ON o.votacao_id = vt.votacao_id AND o.partido = vt.partido_na_data
      WHERE o.orientacao IN ('Sim', 'Não') AND vt.voto IN ('Sim', 'Não', 'Abstenção', 'Obstrução') GROUP BY 1),
    alin_gov AS (
      SELECT vt.deputado_id, avg((vt.voto = o.orientacao)::INT) AS pct_alinhamento_governo
      FROM votos_periodo vt JOIN orientacoes o ON o.votacao_id = vt.votacao_id AND o.bancada = 'Governo'
      WHERE o.orientacao IN ('Sim', 'Não') AND vt.voto IN ('Sim', 'Não', 'Abstenção', 'Obstrução') GROUP BY 1)
    SELECT d.id AS deputado_id,
      coalesce(g.gasto_total, 0) AS gasto_total,
      CASE WHEN m.meses_exercicio > 0 THEN coalesce(g.gasto_total, 0) / m.meses_exercicio ELSE 0 END AS gasto_medio_mensal,
      CASE WHEN m.meses_exercicio > 0 AND c.valor > 0 THEN coalesce(g.gasto_total, 0) / (c.valor * m.meses_exercicio) END
        AS pct_cota_usada,
      CASE WHEN g.gasto_total > 0 THEN mf.v / g.gasto_total ELSE 0 END AS pct_maior_fornecedor,
      coalesce(pp.n_proposicoes_relevantes, 0) AS n_proposicoes_relevantes,
      coalesce(pp.n_proposicoes_coautor, 0) AS n_proposicoes_coautor,
      coalesce(pp.n_requerimentos, 0) AS n_requerimentos,
      coalesce(r.n_relatorias, 0) AS n_relatorias,
      coalesce(pp.n_aprovadas, 0) AS n_aprovadas,
      -- ausência justificada sai do denominador: não conta como presença nem como falta
      CASE WHEN pr.n_sessoes - pr.n_justificadas > 0 THEN pr.n_presente / (pr.n_sessoes - pr.n_justificadas) END
        AS pct_presenca_sessoes,
      coalesce(pr.n_justificadas, 0) AS n_faltas_justificadas,
      CASE WHEN pr.n_sessoes IS NOT NULL THEN pr.n_sessoes - pr.n_presente - pr.n_justificadas END AS n_faltas_sem_justificativa,
      pa.pct_participacao_votacoes,
      ap.pct_alinhamento_partido,
      ag.pct_alinhamento_governo,
      coalesce(ap.n_votos_contra_bancada, 0) AS n_votos_contra_bancada,
      CASE WHEN pp.n_proposicoes_relevantes > 0 THEN coalesce(g.gasto_total, 0) / pp.n_proposicoes_relevantes END
        AS custo_por_proposicao,
      CASE WHEN pr.n_presente > 0 THEN coalesce(g.gasto_total, 0) / pr.n_presente END AS custo_por_sessao,
      coalesce(m.meses_exercicio, 0) AS meses_exercicio
    FROM deputados d
    LEFT JOIN meses m ON m.deputado_id = d.id
    LEFT JOIN gastos g ON g.deputado_id = d.id
    LEFT JOIN maior_forn mf ON mf.deputado_id = d.id
    LEFT JOIN props pp ON pp.deputado_id = d.id
    LEFT JOIN relat r ON r.deputado_id = d.id
    LEFT JOIN pres pr ON pr.deputado_id = d.id
    LEFT JOIN part pa ON pa.deputado_id = d.id
    LEFT JOIN alin_partido ap ON ap.deputado_id = d.id
    LEFT JOIN alin_gov ag ON ag.deputado_id = d.id
    LEFT JOIN _cota c ON c.uf = d.uf
    """, p)
    _posicoes(con)


def _posicoes(con: duckdb.DuckDBPyConnection) -> None:
    partes = []
    for ind in INDICADORES:
        ordem = "ASC" if ind in MENOR_MELHOR else "DESC"
        partes.append(f"""
        SELECT i.deputado_id, '{ind}' AS indicador,
          rank() OVER (ORDER BY i.{ind} {ordem} NULLS LAST) AS brasil,
          rank() OVER (PARTITION BY d.uf ORDER BY i.{ind} {ordem} NULLS LAST) AS uf,
          rank() OVER (PARTITION BY d.partido_atual ORDER BY i.{ind} {ordem} NULLS LAST) AS partido,
          round(100 * percent_rank() OVER (ORDER BY i.{ind} ASC NULLS FIRST), 1) AS percentil,
          count(*) OVER () AS total
        FROM indicadores i JOIN deputados d ON d.id = i.deputado_id
        WHERE i.meses_exercicio >= 1 AND i.{ind} IS NOT NULL""")
    con.execute("CREATE OR REPLACE TABLE posicoes AS " + " UNION ALL ".join(partes))


def agregados(con: duckdb.DuckDBPyConnection) -> dict:
    """Estatísticas de cada indicador para Brasil, por UF e por partido (só deputados com exercício no período)."""
    stats = ", ".join(f"avg({i}) AS {i}__media, median({i}) AS {i}__mediana, sum({i}) AS {i}__soma" for i in INDICADORES)
    out: dict = {}
    for escopo, chave in (("brasil", "'BR'"), ("uf", "d.uf"), ("partido", "d.partido_atual")):
        cur = con.execute(f"""
            SELECT {chave} AS k, count(*) AS n, {stats}
            FROM indicadores i JOIN deputados d ON d.id = i.deputado_id WHERE i.meses_exercicio >= 1 GROUP BY 1""")
        cols = [c[0] for c in cur.description]
        grupos = {}
        for row in cur.fetchall():
            r = dict(zip(cols, row))
            g = {"n": r["n"]}
            for i in INDICADORES:
                g[i] = {s: r[f"{i}__{s}"] for s in ("media", "mediana", "soma")}
            grupos[r["k"]] = g
        out[escopo] = grupos.get("BR", {}) if escopo == "brasil" else grupos
    return out
