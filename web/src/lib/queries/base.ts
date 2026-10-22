import type { Filtros } from "../filters";

export interface Consulta {
  sql: string;
  params: unknown[];
}

/** Monta o WHERE de despesas (alias e) + deputados (alias d) só com parâmetros posicionais. */
export function whereDespesas(f: Filtros): Consulta {
  const c: string[] = [];
  const p: unknown[] = [];
  const add = (cond: string, v: unknown) => { c.push(cond); p.push(v); };
  if (f.inicio) add("e.ano_mes >= ?", f.inicio);
  if (f.fim) add("e.ano_mes <= ?", f.fim);
  if (f.uf) add("d.uf = ?", f.uf);
  if (f.partido) add("d.partido_atual = ?", f.partido);
  if (f.categoria) add("e.categoria = ?", f.categoria);
  if (f.cnpj) add("e.cnpj_cpf = ?", f.cnpj);
  if (f.deputado) add("e.deputado_id = ?", f.deputado);
  if (f.fornecedor) add("upper(e.fornecedor) LIKE '%' || upper(?) || '%'", f.fornecedor);
  if (f.passageiro) add("upper(e.passageiro) LIKE '%' || upper(?) || '%'", f.passageiro);
  if (f.so_passagens) c.push("e.categoria ILIKE '%PASSAGE%'");
  return { sql: c.length ? `WHERE ${c.join(" AND ")}` : "", params: p };
}

export const FROM_DESPESAS = "FROM despesas e JOIN deputados d ON d.id = e.deputado_id";
