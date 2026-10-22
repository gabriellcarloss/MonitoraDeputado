import type { Filtros } from "../filters";
import { type Consulta, FROM_DESPESAS, whereDespesas } from "./base";

const PASSAGEM = "e.categoria ILIKE '%PASSAGE%'";

function e(extra: string, w: Consulta): string {
  return w.sql ? `${w.sql} AND ${extra}` : `WHERE ${extra}`;
}

export function sqlSerieMensal(f: Filtros): Consulta {
  const w = whereDespesas(f);
  return { sql: `SELECT e.ano_mes AS periodo, sum(e.valor_liquido) AS valor, count(*) AS n ${FROM_DESPESAS} ${w.sql}
    GROUP BY 1 ORDER BY 1`, params: w.params };
}

export function sqlPorCategoria(f: Filtros): Consulta {
  const w = whereDespesas(f);
  return { sql: `SELECT e.categoria, sum(e.valor_liquido) AS valor, count(*) AS n ${FROM_DESPESAS} ${w.sql}
    GROUP BY 1 ORDER BY 2 DESC`, params: w.params };
}

export function sqlTopFornecedores(f: Filtros, n: number): Consulta {
  const w = whereDespesas(f);
  return { sql: `SELECT e.cnpj_cpf AS cnpj, coalesce(any_value(fo.razao_social), any_value(e.fornecedor)) AS nome,
      sum(e.valor_liquido) AS valor, count(*) AS n, count(DISTINCT e.deputado_id) AS deputados
    ${FROM_DESPESAS} LEFT JOIN fornecedores fo ON fo.cnpj = e.cnpj_cpf ${w.sql}
    GROUP BY 1 ORDER BY valor DESC LIMIT ?`, params: [...w.params, n] };
}

export function sqlNotas(f: Filtros, limite: number, offset: number): Consulta {
  const w = whereDespesas(f);
  return { sql: `SELECT e.ide_documento, e.deputado_id, d.nome AS deputado, d.partido_atual AS partido, d.uf,
      e.data, e.ano_mes, e.categoria, e.fornecedor, e.cnpj_cpf, e.passageiro, e.trecho, e.passageiro_e_deputado,
      e.valor_documento, e.valor_glosa, e.valor_liquido, e.url_documento
    ${FROM_DESPESAS} ${w.sql} ORDER BY e.data DESC NULLS LAST, e.valor_liquido DESC LIMIT ? OFFSET ?`,
    params: [...w.params, limite, offset] };
}

export function sqlContarNotas(f: Filtros): Consulta {
  const w = whereDespesas(f);
  return { sql: `SELECT count(*) AS n, sum(e.valor_liquido) AS total ${FROM_DESPESAS} ${w.sql}`, params: w.params };
}

export function sqlPassagens(f: Filtros): Consulta {
  const w = whereDespesas(f);
  return { sql: `SELECT e.trecho, count(*) AS n, sum(e.valor_liquido) AS valor,
      count(*) FILTER (e.passageiro_e_deputado = false) AS terceiros
    ${FROM_DESPESAS} ${e(PASSAGEM, w)} GROUP BY 1 ORDER BY valor DESC LIMIT 30`, params: w.params };
}

export function sqlPassageirosTerceiros(f: Filtros): Consulta {
  const w = whereDespesas(f);
  return { sql: `SELECT e.passageiro, count(*) AS n, sum(e.valor_liquido) AS valor,
      count(DISTINCT e.deputado_id) AS deputados, string_agg(DISTINCT d.nome, ', ') AS nomes_deputados
    ${FROM_DESPESAS} ${e("e.passageiro_e_deputado = false", w)} GROUP BY 1 ORDER BY valor DESC`, params: w.params };
}

export function sqlRankingTerceiros(f: Filtros): Consulta {
  const w = whereDespesas(f);
  return { sql: `SELECT e.deputado_id, d.nome, d.partido_atual AS partido, d.uf, count(*) AS n, sum(e.valor_liquido) AS valor
    ${FROM_DESPESAS} ${e("e.passageiro_e_deputado = false", w)} GROUP BY ALL ORDER BY n DESC LIMIT 20`, params: w.params };
}

export function sqlFornecedor(cnpj: string): Consulta {
  return { sql: `SELECT * FROM fornecedores WHERE cnpj = ?`, params: [cnpj] };
}

export function sqlDeputadosDoFornecedor(cnpj: string): Consulta {
  return { sql: `SELECT e.deputado_id, d.nome, d.partido_atual AS partido, d.uf, sum(e.valor_liquido) AS valor, count(*) AS n,
      min(e.data) AS primeiro, max(e.data) AS ultimo
    ${FROM_DESPESAS} WHERE e.cnpj_cpf = ? GROUP BY ALL ORDER BY valor DESC`, params: [cnpj] };
}

export function sqlCategorias(): Consulta {
  return { sql: "SELECT DISTINCT categoria FROM despesas ORDER BY 1", params: [] };
}

export function sqlSerieFornecedor(cnpj: string): Consulta {
  return { sql: `SELECT periodo, valor FROM series WHERE escopo = 'fornecedor' AND metrica = 'gasto' AND chave = ? ORDER BY periodo`,
    params: [cnpj] };
}

/** Arestas da ego-rede do fornecedor: deputados que pagaram e sócios, com rótulos dos deputados. */
export function sqlRedeFornecedor(cnpj: string): Consulta {
  return { sql: `SELECT a.*, d.nome AS rotulo_origem FROM rede_arestas a
    LEFT JOIN deputados d ON a.origem_tipo = 'deputado' AND d.id::VARCHAR = a.origem_id
    WHERE (a.destino_tipo = 'fornecedor' AND a.destino_id = ?) OR (a.origem_tipo = 'fornecedor' AND a.origem_id = ?)`,
    params: [cnpj, cnpj] };
}
