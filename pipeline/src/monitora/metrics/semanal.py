"""Resumo da última semana (7 dias até `hoje`), por deputado e geral.

Alimenta o e-mail semanal da newsletter: a planilha de cadastros diz o interesse de cada pessoa
(um deputado ou "Resumo geral") e o script busca o arquivo certo em /data/semanal/.
"""
from __future__ import annotations

from datetime import date, timedelta


def _linhas(con, sql, params=None):
    cur = con.execute(sql, params or [])
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def _dia(d) -> str | None:
    return d.isoformat() if d else None


def resumo_semanal(con, alertas: list[dict], hoje: date | None = None) -> dict[str, dict]:
    """Devolve {"geral": {...}, "<id do deputado>": {...}}."""
    hoje = hoje or date.today()
    ini = hoje - timedelta(days=6)
    janela = {"inicio": ini.isoformat(), "fim": hoje.isoformat()}
    p = [ini, hoje]

    sessoes = con.execute("SELECT count(*) FROM sessoes WHERE data BETWEEN ? AND ?", p).fetchone()[0]
    votacoes = _linhas(con, """
        SELECT v.id, v.data, v.descricao, v.aprovacao, v.tema, v.sigla_orgao,
               coalesce(v.votos_sim, 0) AS sim, coalesce(v.votos_nao, 0) AS nao, coalesce(v.votos_outros, 0) AS outros
        FROM votacoes v WHERE v.data BETWEEN ? AND ? AND v.descricao IS NOT NULL
        ORDER BY coalesce(v.votos_sim, 0) + coalesce(v.votos_nao, 0) + coalesce(v.votos_outros, 0) DESC""", p)

    def destaque(v):
        return {"data": _dia(v["data"]), "descricao": (v["descricao"] or "")[:240], "tema": v["tema"],
                "resultado": {1: "aprovada", 0: "rejeitada"}.get(v["aprovacao"]), "sim": v["sim"], "nao": v["nao"]}

    props = _linhas(con, """
        SELECT p.id, p.sigla_tipo, p.numero, p.ano, p.ementa, p.tema, p.data_apresentacao
        FROM proposicoes p WHERE p.data_apresentacao BETWEEN ? AND ?""", p)
    temas = _linhas(con, """
        SELECT coalesce(tema, 'Outros') AS tema, count(*) AS n FROM votacoes
        WHERE data BETWEEN ? AND ? GROUP BY 1 ORDER BY n DESC, tema LIMIT 3""", p)
    gasto_total = con.execute("SELECT coalesce(sum(valor_liquido), 0) FROM despesas WHERE data BETWEEN ? AND ?", p).fetchone()[0]
    top_gastos = _linhas(con, """
        SELECT d.id, d.nome, d.partido_atual AS partido, d.uf, sum(e.valor_liquido) AS valor
        FROM despesas e JOIN deputados d ON d.id = e.deputado_id WHERE e.data BETWEEN ? AND ?
        GROUP BY d.id, d.nome, d.partido_atual, d.uf ORDER BY valor DESC LIMIT 3""", p)

    out: dict[str, dict] = {"geral": {
        "janela": janela, "sessoes": sessoes, "votacoes": len(votacoes),
        "aprovadas": sum(1 for v in votacoes if v["aprovacao"] == 1),
        "rejeitadas": sum(1 for v in votacoes if v["aprovacao"] == 0),
        "destaques": [destaque(v) for v in votacoes[:3]],
        "temas": temas, "proposicoes": len(props), "gasto_cota": gasto_total, "maiores_gastos": top_gastos}}

    # --- por deputado ---
    pres = {r["deputado_id"]: r for r in _linhas(con, """
        SELECT pr.deputado_id, count(*) AS sessoes, sum(CASE WHEN pr.presente THEN 1 ELSE 0 END) AS presentes
        FROM presencas pr JOIN sessoes s ON s.id = pr.sessao_id WHERE s.data BETWEEN ? AND ? GROUP BY 1""", p)}
    votos: dict[int, list] = {}
    for r in _linhas(con, """
        SELECT vt.deputado_id, vt.voto, v.id AS votacao_id, v.descricao, v.aprovacao, v.data,
               coalesce(v.votos_sim, 0) + coalesce(v.votos_nao, 0) + coalesce(v.votos_outros, 0) AS peso
        FROM votos vt JOIN votacoes v ON v.id = vt.votacao_id
        WHERE v.data BETWEEN ? AND ? AND v.descricao IS NOT NULL ORDER BY peso DESC""", p):
        votos.setdefault(r["deputado_id"], []).append(r)
    autorias: dict[int, list] = {}
    for r in _linhas(con, """
        SELECT a.deputado_id, p.sigla_tipo, p.numero, p.ano, p.ementa, p.tema, a.proponente_principal AS principal
        FROM autorias a JOIN proposicoes p ON p.id = a.proposicao_id
        WHERE p.data_apresentacao BETWEEN ? AND ? ORDER BY a.proponente_principal DESC, p.data_apresentacao DESC""", p):
        autorias.setdefault(r["deputado_id"], []).append(r)
    gastos = {r["deputado_id"]: r for r in _linhas(con, """
        SELECT deputado_id, sum(valor_liquido) AS total, count(*) AS n,
               arg_max(categoria, valor_liquido) AS maior_categoria, max(valor_liquido) AS maior_valor
        FROM despesas WHERE data BETWEEN ? AND ? GROUP BY 1""", p)}
    recente = {r["deputado_id"]: r for r in _linhas(con, """
        SELECT deputado_id, ano_mes, sum(valor_liquido) AS total FROM despesas
        WHERE ano_mes = (SELECT max(ano_mes) FROM despesas) GROUP BY 1, 2""")}
    n_alertas: dict[int, list] = {}
    for a in alertas:
        n_alertas.setdefault(a["deputado_id"], []).append(a.get("titulo") or a["regra"])

    for d in _linhas(con, "SELECT id, nome, uf, partido_atual AS partido, foto FROM deputados"):
        i = d["id"]
        pr, vs, au, g = pres.get(i), votos.get(i, []), autorias.get(i, []), gastos.get(i)
        out[str(i)] = {
            "janela": janela, "deputado": d,
            "presenca": ({"sessoes": pr["sessoes"], "presentes": pr["presentes"],
                          "faltas": pr["sessoes"] - pr["presentes"]} if pr else None),
            "votos": {"total": len(vs), "destaques": [
                {"descricao": (v["descricao"] or "")[:240], "voto": v["voto"],
                 "resultado": {1: "aprovada", 0: "rejeitada"}.get(v["aprovacao"])} for v in vs[:3]]},
            "proposicoes": {"total": len(au), "itens": [
                {"nome": f'{a["sigla_tipo"]} {a["numero"]}/{a["ano"]}', "ementa": (a["ementa"] or "")[:240], "tema": a["tema"]}
                for a in au[:3]]},
            "gasto_semana": ({"total": g["total"], "documentos": g["n"], "maior_categoria": g["maior_categoria"]} if g else None),
            "gasto_mes_recente": ({"ano_mes": recente[i]["ano_mes"], "total": recente[i]["total"]} if i in recente else None),
            "alertas": {"total": len(n_alertas.get(i, [])), "titulos": n_alertas.get(i, [])[:3]},
        }
    return out
