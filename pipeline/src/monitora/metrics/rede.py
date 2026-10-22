"""Rede de relações: deputado → fornecedor, deputado → passageiro (terceiros), fornecedor → sócio."""
import duckdb

_NOME = "regexp_replace(strip_accents(upper(trim({c}))), '\\s+', ' ', 'g')"


def gerar_rede(con: duckdb.DuckDBPyConnection) -> None:
    pas = _NOME.format(c="passageiro")
    soc = _NOME.format(c="s.nome")
    con.execute(f"""
    CREATE OR REPLACE TABLE rede_arestas AS
    SELECT 'deputado' AS origem_tipo, deputado_id::VARCHAR AS origem_id, 'fornecedor' AS destino_tipo,
           coalesce(cnpj_cpf, 'NOME:' || upper(trim(fornecedor))) AS destino_id, sum(valor_liquido) AS valor, count(*) AS n
    FROM despesas GROUP BY ALL
    UNION ALL
    SELECT 'deputado', deputado_id::VARCHAR, 'passageiro', {pas}, sum(valor_liquido), count(*)
    FROM despesas WHERE passageiro_e_deputado = false GROUP BY ALL
    UNION ALL
    SELECT 'fornecedor', f.cnpj, 'socio', {soc}, NULL, 1
    FROM (SELECT cnpj, unnest(socios) AS s FROM fornecedores) f
    WHERE f.cnpj IN (SELECT cnpj_cpf FROM despesas);

    CREATE OR REPLACE TABLE rede_nos AS
    SELECT 'deputado' AS tipo, id::VARCHAR AS id, nome AS rotulo FROM deputados
    UNION ALL
    SELECT 'fornecedor', coalesce(e.cnpj_cpf, 'NOME:' || upper(trim(e.fornecedor))),
           coalesce(any_value(f.razao_social), any_value(e.fornecedor))
    FROM despesas e LEFT JOIN fornecedores f ON f.cnpj = e.cnpj_cpf GROUP BY 2
    UNION ALL
    SELECT DISTINCT destino_tipo, destino_id, destino_id FROM rede_arestas WHERE destino_tipo IN ('passageiro', 'socio');
    """)


def ego_rede(con: duckdb.DuckDBPyConnection, tipo: str, id_: str, limite: int = 150) -> dict:
    """Vizinhança de um nó; para deputados inclui outros deputados ligados aos mesmos fornecedores/passageiros."""
    segundo_salto = """
      UNION
      SELECT a.* FROM rede_arestas a JOIN h1 ON a.destino_tipo = h1.destino_tipo AND a.destino_id = h1.destino_id
      WHERE h1.destino_tipo IN ('fornecedor', 'passageiro') AND a.origem_tipo = 'deputado'
      UNION
      SELECT a.* FROM rede_arestas a JOIN h1 ON a.origem_tipo = h1.destino_tipo AND a.origem_id = h1.destino_id
      WHERE h1.destino_tipo = 'fornecedor'""" if tipo == "deputado" else ""
    arestas = con.execute(f"""
      WITH h1 AS (SELECT * FROM rede_arestas WHERE (origem_tipo = $t AND origem_id = $i) OR (destino_tipo = $t AND destino_id = $i))
      SELECT * FROM h1 {segundo_salto}""", {"t": tipo, "i": id_}).fetchall()
    peso: dict[str, float] = {}
    for ot, oi, dt, di, v, _ in arestas:
        for no in (f"{ot}:{oi}", f"{dt}:{di}"):
            peso[no] = peso.get(no, 0) + (v or 0)
    centro = f"{tipo}:{id_}"
    outros = sorted((n for n in peso if n != centro), key=lambda n: -peso[n])[: limite - 1]
    escolhidos = [centro, *outros] if peso else []
    rotulos = {}
    if escolhidos:
        pares = [n.split(":", 1) for n in escolhidos]
        con.execute("CREATE OR REPLACE TEMP TABLE _ego (tipo VARCHAR, id VARCHAR)")
        con.executemany("INSERT INTO _ego VALUES (?, ?)", pares)
        rotulos = {f"{t}:{i}": r for t, i, r in con.execute(
            "SELECT n.tipo, n.id, n.rotulo FROM rede_nos n JOIN _ego USING (tipo, id)").fetchall()}
    sel = set(escolhidos)
    return {
        "nos": [{"id": n, "tipo": n.split(":", 1)[0], "rotulo": rotulos.get(n, n.split(":", 1)[1]), "valor": peso[n]}
                for n in escolhidos],
        "arestas": [{"origem": f"{ot}:{oi}", "destino": f"{dt}:{di}", "valor": v, "n": n}
                    for ot, oi, dt, di, v, n in arestas if f"{ot}:{oi}" in sel and f"{dt}:{di}" in sel],
    }
