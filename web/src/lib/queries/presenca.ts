import type { Filtros } from "../filters";
import type { Consulta } from "./base";

function where(f: Filtros): Consulta {
  const c: string[] = [];
  const p: unknown[] = [];
  if (f.inicio) { c.push("strftime(s.data, '%Y-%m') >= ?"); p.push(f.inicio); }
  if (f.fim) { c.push("strftime(s.data, '%Y-%m') <= ?"); p.push(f.fim); }
  if (f.uf) { c.push("d.uf = ?"); p.push(f.uf); }
  if (f.partido) { c.push("d.partido_atual = ?"); p.push(f.partido); }
  return { sql: c.length ? `WHERE ${c.join(" AND ")}` : "", params: p };
}

const FROM = "FROM presencas pr JOIN sessoes s ON s.id = pr.sessao_id JOIN deputados d ON d.id = pr.deputado_id";

export function sqlRankingPresenca(f: Filtros, ordem: "asc" | "desc"): Consulta {
  const w = where(f);
  return { sql: `SELECT d.id AS deputado_id, d.nome, d.partido_atual AS partido, d.uf, count(*) AS sessoes,
      count(*) FILTER (pr.presente) AS presentes, avg(pr.presente::INT) AS pct
    ${FROM} ${w.sql} GROUP BY ALL ORDER BY pct ${ordem === "asc" ? "ASC" : "DESC"}, sessoes DESC`, params: w.params };
}

export function sqlPresencaMensal(f: Filtros): Consulta {
  const w = where(f);
  return { sql: `SELECT strftime(s.data, '%Y-%m') AS periodo, avg(pr.presente::INT) AS valor, count(DISTINCT s.id) AS sessoes
    ${FROM} ${w.sql} GROUP BY 1 ORDER BY 1`, params: w.params };
}
