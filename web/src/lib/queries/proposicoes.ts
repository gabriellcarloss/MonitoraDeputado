import type { Filtros } from "../filters";
import type { Consulta } from "./base";

function where(f: Filtros, soRelevantes = false): Consulta {
  const c: string[] = [];
  const p: unknown[] = [];
  if (f.inicio) { c.push("strftime(p.data_apresentacao, '%Y-%m') >= ?"); p.push(f.inicio); }
  if (f.fim) { c.push("strftime(p.data_apresentacao, '%Y-%m') <= ?"); p.push(f.fim); }
  if (f.tipo) { c.push("p.sigla_tipo = ?"); p.push(f.tipo); }
  if (f.tema) { c.push("p.tema = ?"); p.push(f.tema); }
  if (f.uf) { c.push("d.uf = ?"); p.push(f.uf); }
  if (f.partido) { c.push("d.partido_atual = ?"); p.push(f.partido); }
  if (f.deputado) { c.push("d.id = ?"); p.push(f.deputado); }
  if (f.busca) { c.push("upper(p.ementa) LIKE '%' || upper(?) || '%'"); p.push(f.busca); }
  if (soRelevantes) c.push("p.relevante");
  return { sql: c.length ? `WHERE ${c.join(" AND ")}` : "", params: p };
}

const FROM = `FROM proposicoes p
  LEFT JOIN autorias a ON a.proposicao_id = p.id AND a.proponente_principal
  LEFT JOIN deputados d ON d.id = a.deputado_id`;

export function sqlProposicoes(f: Filtros, limite: number, offset: number): Consulta {
  const w = where(f);
  return { sql: `SELECT p.id, p.sigla_tipo, p.numero, p.ano, p.ementa, p.tema, p.data_apresentacao, p.situacao, p.relevante,
      p.url_inteiro_teor, d.id AS deputado_id, d.nome AS autor, d.partido_atual AS partido, d.uf
    ${FROM} ${w.sql} ORDER BY p.data_apresentacao DESC NULLS LAST, p.id DESC LIMIT ? OFFSET ?`, params: [...w.params, limite, offset] };
}

export function sqlContarProposicoes(f: Filtros): Consulta {
  const w = where(f);
  return { sql: `SELECT count(*) AS n, count(*) FILTER (p.relevante) AS relevantes,
      count(*) FILTER (p.situacao ILIKE '%transformad%norma%') AS viraram_lei ${FROM} ${w.sql}`, params: w.params };
}

export function sqlRankingAutores(f: Filtros, n: number): Consulta {
  const w = where(f, true);
  return { sql: `SELECT d.id AS deputado_id, d.nome, d.partido_atual AS partido, d.uf, count(*) AS n
    ${FROM} ${w.sql}${w.sql ? " AND" : " WHERE"} d.id IS NOT NULL GROUP BY ALL ORDER BY n DESC, d.nome LIMIT ?`, params: [...w.params, n] };
}

export function sqlProposicoesMensal(f: Filtros): Consulta {
  const w = where(f, true);
  return { sql: `SELECT strftime(p.data_apresentacao, '%Y-%m') AS periodo, count(*) AS valor ${FROM} ${w.sql}
    GROUP BY 1 HAVING periodo IS NOT NULL ORDER BY 1`, params: w.params };
}

export function sqlTiposETemas(): Consulta {
  return { sql: `SELECT 'tipo' AS k, sigla_tipo AS v, count(*) AS n FROM proposicoes GROUP BY ALL
    UNION ALL SELECT 'tema', tema, count(*) FROM proposicoes WHERE tema IS NOT NULL GROUP BY ALL ORDER BY k, n DESC`, params: [] };
}
