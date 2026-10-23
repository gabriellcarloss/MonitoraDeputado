"""Escreve o contrato de dados consumido pelo site (JSON agregados + Parquet detalhados)."""
import json
import math
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

import duckdb

from monitora.config import ANOS, MAX_SECRETARIOS, VERBA_GABINETE
from monitora.metrics.alertas import REGRAS, RODAPE
from monitora.metrics.indicadores import INDICADORES, agregados
from monitora.metrics.rede import ego_rede
from monitora.metrics.series import series_de

PARQUETS = ["despesas", "fornecedores", "votacoes", "votos", "orientacoes", "orientacao_partido", "sessoes", "presencas", "proposicoes",
            "autorias", "relatorias", "rede_arestas", "deputados", "series"]

FONTES = {
    "Câmara — Dados Abertos": {"dadosabertos.camara.leg.br"},
    "Câmara — Cota parlamentar (CEAP)": {"www.camara.leg.br"},
    "Receita Federal (CNPJ)": {"minhareceita.org", "brasilapi.com.br"},
    "Câmara — Frequência com justificativas": {"SitCamaraWS"},
    "Câmara — Equipe de gabinete": {"funcionarios"},
    "CGU — Emendas parlamentares": {"dadosabertos-download.cgu.gov.br"},
}

# Presença exportada com a justificativa oficial do dia (licença, missão autorizada…), quando houver.
SQL_PRESENCAS = """
    SELECT p.sessao_id, p.deputado_id, p.presente,
           (NOT p.presente AND f.deputado_id IS NOT NULL) AS justificada,
           CASE WHEN NOT p.presente THEN f.justificativa END AS justificativa
    FROM presencas p JOIN sessoes s ON s.id = p.sessao_id
    LEFT JOIN (SELECT data, deputado_id, any_value(justificativa) AS justificativa FROM frequencia_dia
               WHERE lower(frequencia) LIKE 'aus%ncia justificada' GROUP BY 1, 2) f
      ON f.data = s.data AND f.deputado_id = p.deputado_id"""


def _gabinete(con, id_: int) -> dict:
    sec = _linhas(con, """SELECT nome, cargo, nivel, salario_estimado, nomeacao, inicio FROM secretarios
                          WHERE deputado_id = ? ORDER BY nivel DESC NULLS LAST, nome""", [id_])
    custo = sum(x["salario_estimado"] or 0 for x in sec)
    hoje = date.today()
    recentes = sum(1 for x in sec if x["nomeacao"] and (hoje - x["nomeacao"]).days <= 365)
    return {"secretarios": sec, "n": len(sec), "custo_estimado": custo, "nomeados_12m": recentes,
            "verba": VERBA_GABINETE, "limite": MAX_SECRETARIOS}


def _emendas(con, id_: int) -> dict:
    tot = _linhas(con, """SELECT count(*) AS n, coalesce(sum(empenhado), 0) AS empenhado, coalesce(sum(pago), 0) AS pago,
                                 coalesce(sum(restos_pagos), 0) AS restos_pagos,
                                 coalesce(sum(empenhado) FILTER (pix), 0) AS pix,
                                 coalesce(sum(e.empenhado) FILTER (e.uf IS NOT NULL AND e.uf <> d.uf), 0) AS fora_uf
                          FROM emendas e JOIN deputados d ON d.id = e.deputado_id WHERE e.deputado_id = ?""", [id_])[0]
    return {
        **tot,
        "por_ano": _linhas(con, """SELECT ano, sum(empenhado) AS empenhado, sum(pago) AS pago, sum(empenhado) FILTER (pix) AS pix
                                   FROM emendas WHERE deputado_id = ? GROUP BY 1 ORDER BY 1""", [id_]),
        "por_funcao": _linhas(con, """SELECT coalesce(funcao, 'Não informada') AS rotulo, sum(empenhado) AS valor FROM emendas
                                      WHERE deputado_id = ? GROUP BY 1 ORDER BY 2 DESC LIMIT 10""", [id_]),
        "por_local": _linhas(con, """SELECT coalesce(localidade, municipio, uf, 'Não informada') AS rotulo, any_value(uf) AS uf,
                                            sum(empenhado) AS valor FROM emendas WHERE deputado_id = ?
                                     GROUP BY 1 ORDER BY 3 DESC LIMIT 15""", [id_]),
        "favorecidos": _linhas(con, """SELECT any_value(favorecido) AS nome, any_value(natureza) AS natureza,
                                              any_value(uf) AS uf, any_value(municipio) AS municipio, sum(valor) AS valor
                                       FROM emendas_favorecidos WHERE deputado_id = ?
                                       GROUP BY coalesce(codigo_favorecido, favorecido) ORDER BY valor DESC LIMIT 15""", [id_]),
        "lista": _linhas(con, """SELECT codigo, ano, tipo, localidade, uf, funcao, empenhado, pago, pix FROM emendas
                                 WHERE deputado_id = ? ORDER BY empenhado DESC LIMIT 60""", [id_]),
    }


def _limpo(v):
    if isinstance(v, float):
        return v if math.isfinite(v) else None
    if isinstance(v, Decimal):
        return _limpo(float(v))
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    if isinstance(v, dict):
        return {k: _limpo(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_limpo(x) for x in v]
    return v


def _grava(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(_limpo(obj), ensure_ascii=False, allow_nan=False, separators=(",", ":")))


def _linhas(con, sql: str, params=None) -> list[dict]:
    cur = con.execute(sql, params or [])
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def exportar(con: duckdb.DuckDBPyConnection, out_dir: Path, alertas: list[dict], stale: set[str],
             anterior: dict | None = None, extra_meta: dict | None = None) -> None:
    out_dir = Path(out_dir)
    agora = datetime.now(timezone.utc).isoformat(timespec="seconds")

    deps = _linhas(con, """
        SELECT d.*, d.fim_exercicio IS NULL AND d.inicio_exercicio IS NOT NULL AS em_exercicio,
               (SELECT count(*) FROM deputado_partidos p WHERE p.deputado_id = d.id) > 1 AS trocou_partido
        FROM deputados d ORDER BY d.nome""")
    inds = {r.pop("deputado_id"): r for r in _linhas(con, "SELECT * FROM indicadores")}
    pos: dict[int, dict] = {}
    for r in _linhas(con, "SELECT * FROM posicoes"):
        pos.setdefault(r["deputado_id"], {})[r["indicador"]] = {k: r[k] for k in ("brasil", "uf", "partido", "percentil", "total")}
    gab = {r[0]: (r[1], r[2]) for r in con.execute(
        "SELECT deputado_id, count(*), sum(coalesce(salario_estimado, 0)) FROM secretarios GROUP BY 1").fetchall()}
    emd = {r[0]: (r[1], r[2]) for r in con.execute(
        "SELECT deputado_id, sum(empenhado), sum(pago) FROM emendas GROUP BY 1").fetchall()}
    alertas_por_dep: dict[int, list] = {}
    for a in alertas:
        alertas_por_dep.setdefault(a["deputado_id"], []).append(a)

    resumo = []
    for d in deps:
        d["gabinete"] = json.loads(d["gabinete"]) if d.get("gabinete") else None
        id_ = d["id"]
        als = alertas_por_dep.get(id_, [])
        resumo.append({**{k: d[k] for k in ("id", "nome", "uf", "partido_atual", "foto", "sexo", "situacao",
                                              "condicao_eleitoral", "inicio_exercicio", "fim_exercicio", "em_exercicio",
                                              "trocou_partido")},
                       "indicadores": inds.get(id_), "posicoes": pos.get(id_, {}), "n_alertas": len(als),
                       "regras_alerta": sorted({a["regra"] for a in als}),
                       "n_secretarios": gab.get(id_, (0, 0))[0], "custo_equipe_estimado": gab.get(id_, (0, 0))[1],
                       "emendas_empenhado": emd.get(id_, (0, 0))[0], "emendas_pago": emd.get(id_, (0, 0))[1]})
        _grava(out_dir / "deputado" / f"{id_}.json", {
            "deputado": d, "indicadores": inds.get(id_), "posicoes": pos.get(id_, {}),
            "series": series_de(con, "deputado", str(id_)), "alertas": als,
            "top_fornecedores": _linhas(con, """
                SELECT e.cnpj_cpf AS cnpj, coalesce(any_value(f.razao_social), any_value(e.fornecedor)) AS nome,
                       sum(e.valor_liquido) AS valor, count(*) AS n
                FROM despesas e LEFT JOIN fornecedores f ON f.cnpj = e.cnpj_cpf
                WHERE e.deputado_id = ? GROUP BY e.cnpj_cpf ORDER BY valor DESC LIMIT 10""", [id_]),
            "proposicoes": _linhas(con, """
                SELECT p.*, a.proponente_principal AS principal FROM autorias a JOIN proposicoes p ON p.id = a.proposicao_id
                WHERE a.deputado_id = ? ORDER BY p.relevante DESC, a.proponente_principal DESC, p.data_apresentacao DESC
                LIMIT 200""", [id_]),
            "rede": ego_rede(con, "deputado", str(id_)),
            "gabinete": _gabinete(con, id_),
            "emendas": _emendas(con, id_),
        })
    _grava(out_dir / "deputados.json", resumo)
    _grava(out_dir / "alertas.json", alertas)

    chaves = lambda esc: [r[0] for r in con.execute(  # noqa: E731
        "SELECT DISTINCT chave FROM series WHERE escopo = ? ORDER BY 1", [esc]).fetchall()]
    _grava(out_dir / "brasil.json", {
        "agregados": agregados(con),
        "series": series_de(con, "brasil", "BR"),
        "series_uf": {k: series_de(con, "uf", k) for k in chaves("uf")},
        "series_partido": {k: series_de(con, "partido", k) for k in chaves("partido")},
        "totais": _linhas(con, """
            SELECT (SELECT sum(valor_liquido) FROM despesas) AS gasto_total,
                   (SELECT count(*) FROM votacoes) AS n_votacoes,
                   (SELECT count(*) FROM proposicoes WHERE relevante) AS n_proposicoes_relevantes,
                   (SELECT count(*) FROM sessoes) AS n_sessoes,
                   (SELECT coalesce(sum(empenhado), 0) FROM emendas) AS emendas_empenhado,
                   (SELECT coalesce(sum(pago), 0) FROM emendas) AS emendas_pago,
                   (SELECT count(*) FROM secretarios) AS n_secretarios""")[0] | {"n_alertas": len(alertas)},
    })

    (out_dir / "parquet").mkdir(parents=True, exist_ok=True)
    # Ordenar pelas colunas mais filtradas permite que o navegador pule blocos inteiros do arquivo.
    ordem = {"despesas": "deputado_id, ano_mes", "votos": "deputado_id, votacao_id", "presencas": "deputado_id",
             "series": "escopo, chave, metrica, periodo", "autorias": "deputado_id"}
    for t in PARQUETS:
        ob = f" ORDER BY {ordem[t]}" if t in ordem else ""
        fonte = f"({SQL_PRESENCAS})" if t == "presencas" else t
        con.execute(f"COPY (SELECT * FROM {fonte}{ob}) TO '{out_dir / 'parquet' / f'{t}.parquet'}' (FORMAT parquet, COMPRESSION zstd)")

    fontes_ant = (anterior or {}).get("fontes", {})
    fontes = {}
    for nome, hosts in FONTES.items():
        desat = bool(hosts & stale)
        fontes[nome] = {"desatualizada": desat,
                        "atualizado_em": fontes_ant.get(nome, {}).get("atualizado_em") if desat else agora}
    _grava(out_dir / "meta.json", {
        "gerado_em": agora, "anos": ANOS, "fontes": fontes, "indicadores": INDICADORES,
        "contagens": {t: con.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
                      for t in [*PARQUETS, "frequencia_dia", "secretarios", "emendas", "emendas_favorecidos"]},
        "regras": [{"id": r.id, "titulo": r.titulo, "severidade": r.severidade, "descricao": r.descricao}
                   for r in REGRAS.values()],
        "rodape_alerta": RODAPE,
        "ficticio": False,
        **(extra_meta or {}),
    })
