"""Escreve o contrato de dados consumido pelo site (JSON agregados + Parquet detalhados)."""
import json
import math
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

import duckdb

from monitora.config import ANOS
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
                       "regras_alerta": sorted({a["regra"] for a in als})})
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
                   (SELECT count(*) FROM sessoes) AS n_sessoes""")[0] | {"n_alertas": len(alertas)},
    })

    (out_dir / "parquet").mkdir(parents=True, exist_ok=True)
    # Ordenar pelas colunas mais filtradas permite que o navegador pule blocos inteiros do arquivo.
    ordem = {"despesas": "deputado_id, ano_mes", "votos": "deputado_id, votacao_id", "presencas": "deputado_id",
             "series": "escopo, chave, metrica, periodo", "autorias": "deputado_id"}
    for t in PARQUETS:
        ob = f" ORDER BY {ordem[t]}" if t in ordem else ""
        con.execute(f"COPY (SELECT * FROM {t}{ob}) TO '{out_dir / 'parquet' / f'{t}.parquet'}' (FORMAT parquet, COMPRESSION zstd)")

    fontes_ant = (anterior or {}).get("fontes", {})
    fontes = {}
    for nome, hosts in FONTES.items():
        desat = bool(hosts & stale)
        fontes[nome] = {"desatualizada": desat,
                        "atualizado_em": fontes_ant.get(nome, {}).get("atualizado_em") if desat else agora}
    _grava(out_dir / "meta.json", {
        "gerado_em": agora, "anos": ANOS, "fontes": fontes, "indicadores": INDICADORES,
        "contagens": {t: con.execute(f"SELECT count(*) FROM {t}").fetchone()[0] for t in PARQUETS},
        "regras": [{"id": r.id, "titulo": r.titulo, "severidade": r.severidade, "descricao": r.descricao}
                   for r in REGRAS.values()],
        "rodape_alerta": RODAPE,
        "ficticio": False,
        **(extra_meta or {}),
    })
