"""Checagens antes de publicar: se alguma falhar, o site continua com a versão anterior."""
from datetime import date

import duckdb

COLUNAS_OBRIGATORIAS = {
    "deputados": {"id", "nome", "uf", "partido_atual"},
    "despesas": {"ide_documento", "deputado_id", "ano_mes", "categoria", "cnpj_cpf", "valor_liquido", "passageiro",
                 "url_documento", "passageiro_e_deputado"},
    "votacoes": {"id", "data", "sigla_orgao"},
    "votos": {"votacao_id", "deputado_id", "voto"},
    "proposicoes": {"id", "sigla_tipo", "relevante"},
    "presencas": {"sessao_id", "deputado_id", "presente"},
}


def validar(con: duckdb.DuckDBPyConnection, anterior: dict | None) -> list[str]:
    erros = []
    for tabela, cols in COLUNAS_OBRIGATORIAS.items():
        existentes = {r[0] for r in con.execute(f"DESCRIBE {tabela}").fetchall()}
        if faltando := cols - existentes:
            erros.append(f"{tabela}: colunas ausentes {sorted(faltando)}")
    if erros:
        return erros

    total, em_exercicio = con.execute("""
        SELECT count(*), (SELECT count(DISTINCT deputado_id) FROM exercicios WHERE fim IS NULL) FROM deputados""").fetchone()
    if not 500 <= total <= 800:
        erros.append(f"deputados: {total} na legislatura (esperado entre 500 e 800)")
    if not 450 <= em_exercicio <= 513:
        erros.append(f"deputados: {em_exercicio} em exercício (esperado entre 450 e 513)")

    hoje = date.today()
    if hoje.month > 1:
        n_ano = con.execute("SELECT count(*) FROM despesas WHERE ano_mes LIKE ?", [f"{hoje.year}-%"]).fetchone()[0]
        if n_ano == 0:
            erros.append(f"despesas: nenhuma nota em {hoje.year}")

    n_desp = con.execute("SELECT count(*) FROM despesas").fetchone()[0]
    antes = ((anterior or {}).get("contagens") or {}).get("despesas")
    if antes and n_desp < 0.95 * antes:
        erros.append(f"despesas: {n_desp} linhas, queda de mais de 5% em relação às {antes} da execução anterior")

    orfaos = con.execute("SELECT count(*) FROM votos WHERE votacao_id NOT IN (SELECT id FROM votacoes)").fetchone()[0]
    if orfaos:
        erros.append(f"votos: {orfaos} votos sem votação correspondente")

    negativos = con.execute("""
        SELECT count(*) FROM (SELECT deputado_id FROM despesas GROUP BY 1 HAVING sum(valor_liquido) < 0)""").fetchone()[0]
    if negativos:
        erros.append(f"despesas: {negativos} deputados com gasto total negativo")
    return erros
