"""Regras de pontos de atenção (spec §8). Cada regra devolve alertas com evidências rastreáveis."""
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Callable

import duckdb
from dateutil.easter import easter

from monitora.config import FERIADOS_FIXOS, SOBRENOMES_COMUNS
from monitora.metrics.series import series_de
from monitora.normalize import nome as normalizar

RODAPE = "Ponto de atenção gerado automaticamente a partir de dados públicos. Não constitui acusação."


@dataclass
class Regra:
    id: str
    titulo: str
    severidade: str
    descricao: str
    fn: Callable[[duckdb.DuckDBPyConnection], list[dict]]


REGRAS: dict[str, Regra] = {}


def regra(id_: str, titulo: str, severidade: str, descricao: str):
    def deco(f):
        def fn(con):
            return [{"id": f"{id_}-{dep}", "regra": id_, "deputado_id": dep, "severidade": sev or severidade,
                     "titulo": titulo, "descricao": desc, "evidencias": ev} for dep, desc, ev, sev in f(con)]
        REGRAS[id_] = Regra(id_, titulo, severidade, descricao, fn)
        return f
    return deco


def _brl(v: float) -> str:
    return "R$ " + f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _pct(v: float) -> str:
    return f"{100 * v:.0f}%"


def _ev(tipo: str, ref: str, valor=None, url=None) -> dict:
    return {"tipo": tipo, "ref": ref, "valor": valor, "url": url}


def _forn_url(cnpj: str) -> str:
    return f"/fornecedor/?cnpj={cnpj}"


@regra("G01", "Gasto muito acima da média do estado", "atencao",
       "Gasto da cota no período maior que o dobro da mediana dos deputados da mesma UF.")
def _g01(con):
    rows = con.execute("""
        WITH b AS (SELECT i.deputado_id, d.uf, i.gasto_total FROM indicadores i JOIN deputados d ON d.id = i.deputado_id
                   WHERE i.meses_exercicio > 0),
             m AS (SELECT uf, median(gasto_total) AS med FROM b GROUP BY 1)
        SELECT b.deputado_id, b.gasto_total, m.med, b.uf FROM b JOIN m USING (uf)
        WHERE m.med > 0 AND b.gasto_total > 2 * m.med""").fetchall()
    for dep, g, med, uf in rows:
        fator = f"{g / med:.1f}".replace(".", ",")
        yield dep, f"Gastou {_brl(g)}, {fator}× a mediana de {uf} ({_brl(med)})", \
            [_ev("indicador", "gasto_total", g), _ev("mediana_uf", uf, med)], None


@regra("G02", "Pico mensal de gastos", "atencao",
       "Mês com gasto acima de mediana + 3×MAD da própria série ou acima de 2,5× a média dos 12 meses anteriores.")
def _g02(con):
    deps = [r[0] for r in con.execute("SELECT DISTINCT chave FROM series WHERE escopo='deputado' AND metrica='gasto'").fetchall()]
    for dep in deps:
        serie = next(s for s in series_de(con, "deputado", dep) if s["metrica"] == "gasto")
        if serie["picos"]:
            meses = ", ".join(p["periodo"] for p in serie["picos"])
            yield int(dep), f"Picos de gasto em: {meses}", \
                [_ev("pico", p["periodo"], p["valor"]) for p in serie["picos"]], None


@regra("G03", "Gasto concentrado em um único fornecedor", "atencao",
       "Pelo menos 50% do gasto da cota destinado a um único fornecedor (mínimo de R$ 20 mil).")
def _g03(con):
    rows = con.execute("""
        WITH f AS (SELECT deputado_id, coalesce(cnpj_cpf, fornecedor) AS forn, any_value(fornecedor) AS nome,
                          sum(valor_liquido) AS v FROM despesas GROUP BY 1, 2),
             t AS (SELECT deputado_id, sum(v) AS total FROM f GROUP BY 1)
        SELECT f.deputado_id, f.forn, f.nome, f.v, f.v / t.total FROM f JOIN t USING (deputado_id)
        WHERE f.v >= 20000 AND t.total > 0 AND f.v / t.total >= 0.5""").fetchall()
    for dep, forn, nome, v, share in rows:
        yield dep, f"{_pct(share)} do gasto ({_brl(v)}) com {nome}", [_ev("fornecedor", forn, v, _forn_url(forn))], None


@regra("G04", "Passagens emitidas para outras pessoas", "atencao",
       "Passagens pagas pela cota em que o passageiro não é o próprio deputado.")
def _g04(con):
    rows = con.execute("""
        SELECT deputado_id, count(*), sum(valor_liquido),
               list({'p': passageiro, 't': trecho, 'v': valor_liquido, 'u': url_documento} ORDER BY valor_liquido DESC)[1:20]
        FROM despesas WHERE passageiro_e_deputado = false AND categoria ILIKE '%PASSAGE%' GROUP BY 1""").fetchall()
    for dep, n, v, notas in rows:
        yield dep, f"{n} passagens para terceiros, total {_brl(v)}", \
            [_ev("nota", f"{x['p']} — {x['t'] or 's/ trecho'}", x["v"], x["u"]) for x in notas], \
            "alta" if n >= 5 else "atencao"


@regra("G05", "Fornecedor aberto pouco antes do primeiro pagamento", "alta",
       "CNPJ aberto menos de 6 meses antes do primeiro pagamento feito pelo deputado.")
def _g05(con):
    rows = con.execute("""
        SELECT e.deputado_id, e.cnpj_cpf, any_value(e.fornecedor), f.abertura, min(e.data) AS primeiro
        FROM despesas e JOIN fornecedores f ON f.cnpj = e.cnpj_cpf
        WHERE f.abertura IS NOT NULL AND e.data IS NOT NULL GROUP BY e.deputado_id, e.cnpj_cpf, f.abertura
        HAVING datediff('day', f.abertura, min(e.data)) < 183""").fetchall()
    por_dep: dict = {}
    for dep, cnpj, nome, abertura, primeiro in rows:
        por_dep.setdefault(dep, []).append(_ev("fornecedor", f"{nome} (aberta em {abertura:%d/%m/%Y}, 1º pagamento em "
                                                             f"{primeiro:%d/%m/%Y})", None, _forn_url(cnpj)))
    for dep, ev in por_dep.items():
        yield dep, f"{len(ev)} fornecedor(es) aberto(s) menos de 6 meses antes do primeiro pagamento", ev, None


@regra("G06", "Fornecedor com situação cadastral irregular", "alta",
       "Fornecedor pago cuja situação na Receita Federal não é ATIVA (situação atual do cadastro).")
def _g06(con):
    rows = con.execute("""
        SELECT e.deputado_id, e.cnpj_cpf, any_value(e.fornecedor), f.situacao, sum(e.valor_liquido)
        FROM despesas e JOIN fornecedores f ON f.cnpj = e.cnpj_cpf
        WHERE NOT f.sem_dados AND f.situacao IS NOT NULL AND upper(f.situacao) <> 'ATIVA'
        GROUP BY e.deputado_id, e.cnpj_cpf, f.situacao""").fetchall()
    por_dep: dict = {}
    for dep, cnpj, nome, sit, v in rows:
        por_dep.setdefault(dep, []).append(_ev("fornecedor", f"{nome} ({sit})", v, _forn_url(cnpj)))
    for dep, ev in por_dep.items():
        yield dep, f"{len(ev)} fornecedor(es) com situação diferente de ATIVA", ev, None


def _sobrenome(n: str | None) -> str | None:
    tokens = [t for t in normalizar(n).split(" ") if t not in {"DE", "DA", "DO", "DAS", "DOS", "E"}]
    while tokens and tokens[-1] in {"JUNIOR", "FILHO", "NETO", "SOBRINHO"}:
        tokens.pop()
    return tokens[-1] if len(tokens) > 1 else None


@regra("G07", "Sócio de fornecedor com o mesmo sobrenome", "alta",
       "Um sócio do fornecedor tem o mesmo sobrenome do deputado (sobrenomes muito comuns são ignorados).")
def _g07(con):
    deps = {d: _sobrenome(c or n) for d, n, c in con.execute("SELECT id, nome, nome_civil FROM deputados").fetchall()}
    rows = con.execute("""
        SELECT DISTINCT e.deputado_id, e.cnpj_cpf, f.razao_social, unnest(f.socios).nome
        FROM despesas e JOIN fornecedores f ON f.cnpj = e.cnpj_cpf WHERE len(f.socios) > 0""").fetchall()
    por_dep: dict = {}
    for dep, cnpj, razao, socio in rows:
        s = deps.get(dep)
        if s and s not in SOBRENOMES_COMUNS and _sobrenome(socio) == s:
            por_dep.setdefault(dep, []).append(_ev("socio", f"{socio} — {razao or cnpj}", None, _forn_url(cnpj)))
    for dep, ev in por_dep.items():
        yield dep, f"{len(ev)} sócio(s) de fornecedor com o sobrenome {deps[dep].title()}", ev, None


@regra("G08", "Valores glosados pela Câmara", "atencao",
       "Soma de valores glosados (recusados no reembolso) acima de R$ 5 mil.")
def _g08(con):
    rows = con.execute("""
        SELECT deputado_id, sum(valor_glosa), list({'f': fornecedor, 'g': valor_glosa, 'u': url_documento}
                                                   ORDER BY valor_glosa DESC)[1:10]
        FROM despesas WHERE valor_glosa > 0 GROUP BY 1 HAVING sum(valor_glosa) > 5000""").fetchall()
    for dep, total, notas in rows:
        yield dep, f"{_brl(total)} glosados", [_ev("nota", x["f"], x["g"], x["u"]) for x in notas], None


def _feriados(anos) -> set[date]:
    dias = set()
    for a in anos:
        dias |= {date(a, int(m), int(d)) for m, d in (f.split("-") for f in FERIADOS_FIXOS)}
        p = easter(a)
        dias |= {p - timedelta(days=48), p - timedelta(days=47), p - timedelta(days=2), p + timedelta(days=60)}
    return dias


@regra("G09", "Combustível alto em fim de semana ou feriado", "atencao",
       "Abastecimento em fim de semana ou feriado nacional com valor acima do percentil 95 da categoria.")
def _g09(con):
    p95 = con.execute("SELECT quantile_cont(valor_liquido, 0.95) FROM despesas WHERE categoria ILIKE '%COMBUST%'").fetchone()[0]
    if p95 is None:
        return
    rows = con.execute("""
        SELECT deputado_id, data, fornecedor, valor_liquido, url_documento FROM despesas
        WHERE categoria ILIKE '%COMBUST%' AND data IS NOT NULL AND valor_liquido > ?""", [p95]).fetchall()
    feriados = _feriados({r[1].year for r in rows})
    por_dep: dict = {}
    for dep, dia, forn, v, url in rows:
        if dia.weekday() >= 5 or dia in feriados:
            por_dep.setdefault(dep, []).append(_ev("nota", f"{dia:%d/%m/%Y} — {forn}", v, url))
    for dep, ev in por_dep.items():
        yield dep, f"{len(ev)} abastecimento(s) acima de {_brl(p95)} em fim de semana/feriado", ev, None


@regra("G10", "Fornecedor compartilhado com valores acima do padrão", "atencao",
       "Fornecedor usado por 10 ou mais deputados cuja mediana por nota é mais que o dobro da mediana da categoria.")
def _g10(con):
    rows = con.execute("""
        WITH cat AS (SELECT categoria, median(valor_liquido) AS med FROM despesas GROUP BY 1),
             forn AS (SELECT cnpj_cpf, categoria, any_value(fornecedor) AS nome, median(valor_liquido) AS med,
                             count(DISTINCT deputado_id) AS n
                      FROM despesas WHERE cnpj_cpf IS NOT NULL GROUP BY 1, 2)
        SELECT DISTINCT e.deputado_id, forn.cnpj_cpf, forn.nome, forn.n, forn.med, cat.med
        FROM forn JOIN cat USING (categoria) JOIN despesas e ON e.cnpj_cpf = forn.cnpj_cpf AND e.categoria = forn.categoria
        WHERE forn.n >= 10 AND forn.med > 2 * cat.med""").fetchall()
    por_dep: dict = {}
    for dep, cnpj, nome, n, med, cmed in rows:
        por_dep.setdefault(dep, []).append(
            _ev("fornecedor", f"{nome}: mediana {_brl(med)} vs {_brl(cmed)} na categoria; {n} deputados", med, _forn_url(cnpj)))
    for dep, ev in por_dep.items():
        yield dep, f"Usa {len(ev)} fornecedor(es) compartilhado(s) com valores acima do padrão", ev, None


@regra("P01", "Baixa participação nas votações", "atencao",
       "Participou de menos de 70% das votações nominais do Plenário realizadas durante seu exercício.")
def _p01(con):
    for dep, p in con.execute("SELECT deputado_id, pct_participacao_votacoes FROM indicadores "
                              "WHERE pct_participacao_votacoes < 0.7").fetchall():
        yield dep, f"Votou em {_pct(p)} das votações nominais", [_ev("indicador", "pct_participacao_votacoes", p)], None


@regra("P02", "Presença em sessões entre as mais baixas", "atencao",
       "Presença em sessões deliberativas abaixo do percentil 10 da Câmara.")
def _p02(con):
    p10 = con.execute("SELECT quantile_cont(pct_presenca_sessoes, 0.1) FROM indicadores "
                      "WHERE meses_exercicio > 0 AND pct_presenca_sessoes IS NOT NULL").fetchone()[0]
    if p10 is None:
        return
    for dep, p in con.execute("SELECT deputado_id, pct_presenca_sessoes FROM indicadores WHERE pct_presenca_sessoes < ?",
                              [p10]).fetchall():
        yield dep, f"Presença de {_pct(p)} nas sessões (percentil 10: {_pct(p10)})", \
            [_ev("indicador", "pct_presenca_sessoes", p)], None


@regra("L01", "Nenhum projeto apresentado", "atencao",
       "Nenhuma proposição relevante (PL, PLP, PEC ou PDL) como autor principal após 12 meses ou mais de exercício.")
def _l01(con):
    for dep, m in con.execute("SELECT deputado_id, meses_exercicio FROM indicadores "
                              "WHERE n_proposicoes_relevantes = 0 AND meses_exercicio >= 12").fetchall():
        yield dep, f"Nenhum PL, PLP, PEC ou PDL em {m:.0f} meses de mandato", \
            [_ev("indicador", "n_proposicoes_relevantes", 0)], None


@regra("L02", "Gasta muito e entrega pouco", "alta",
       "Gasto entre os 25% maiores e proposições relevantes entre os 25% menores.")
def _l02(con):
    rows = con.execute("""
        WITH b AS (SELECT * FROM indicadores WHERE meses_exercicio > 0),
             q AS (SELECT quantile_cont(gasto_total, 0.75) AS g75, quantile_cont(n_proposicoes_relevantes, 0.25) AS e25 FROM b)
        SELECT b.deputado_id, b.gasto_total, b.n_proposicoes_relevantes FROM b, q
        WHERE b.gasto_total >= q.g75 AND b.n_proposicoes_relevantes <= q.e25 AND b.gasto_total > 0""").fetchall()
    for dep, g, n in rows:
        yield dep, f"Gastou {_brl(g)} e apresentou {n} proposição(ões) relevante(s)", \
            [_ev("indicador", "gasto_total", g), _ev("indicador", "n_proposicoes_relevantes", n)], None


@regra("V01", "Vota frequentemente contra o próprio partido", "atencao",
       "Votou contra a orientação do próprio partido em mais de 25% das votações orientadas.")
def _v01(con):
    for dep, a, n in con.execute("SELECT deputado_id, pct_alinhamento_partido, n_votos_contra_bancada FROM indicadores "
                                 "WHERE 1 - pct_alinhamento_partido > 0.25").fetchall():
        yield dep, f"Contrariou o partido em {_pct(1 - a)} das votações orientadas ({n} votos)", \
            [_ev("indicador", "pct_alinhamento_partido", a)], None


@regra("V02", "Trocou de partido no mandato", "info", "Mudança de filiação partidária durante a legislatura.")
def _v02(con):
    for dep, partidos in con.execute("""
        SELECT deputado_id, list(partido ORDER BY inicio) FROM deputado_partidos GROUP BY 1 HAVING count(*) > 1""").fetchall():
        yield dep, "Partidos no mandato: " + " → ".join(partidos), [_ev("partido", p) for p in partidos], None


def gerar_alertas(con: duckdb.DuckDBPyConnection) -> list[dict]:
    return [a for r in REGRAS.values() for a in r.fn(con)]
