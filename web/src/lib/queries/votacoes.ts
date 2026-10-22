import type { Filtros } from "../filters";
import type { Consulta } from "./base";

function periodo(f: Filtros, col: string, c: string[], p: unknown[]) {
  if (f.inicio) { c.push(`strftime(${col}, '%Y-%m') >= ?`); p.push(f.inicio); }
  if (f.fim) { c.push(`strftime(${col}, '%Y-%m') <= ?`); p.push(f.fim); }
}

export function sqlVotacoes(f: Filtros, limite = 300): Consulta {
  const c: string[] = [];
  const p: unknown[] = [];
  periodo(f, "v.data", c, p);
  if (f.orgao) { c.push("v.sigla_orgao = ?"); p.push(f.orgao); }
  if (f.busca) { c.push("upper(v.descricao) LIKE '%' || upper(?) || '%'"); p.push(f.busca); }
  return { sql: `SELECT v.id, v.data, v.sigla_orgao, v.descricao, v.aprovacao, v.proposicao_id,
      count(vt.deputado_id) AS n_votos,
      count(*) FILTER (vt.voto = 'Sim') AS sim, count(*) FILTER (vt.voto = 'Não') AS nao,
      count(*) FILTER (vt.voto NOT IN ('Sim', 'Não')) AS outros
    FROM votacoes v JOIN votos vt ON vt.votacao_id = v.id ${c.length ? `WHERE ${c.join(" AND ")}` : ""}
    GROUP BY ALL ORDER BY v.data DESC, v.id LIMIT ?`, params: [...p, limite] };
}

export function sqlVotacao(id: string): Consulta {
  return { sql: "SELECT * FROM votacoes WHERE id = ?", params: [id] };
}

export function sqlVotosDaVotacao(id: string): Consulta {
  return { sql: `SELECT vt.deputado_id, d.nome, d.uf, vt.partido_na_data AS partido, vt.voto, o.orientacao AS orientacao_partido,
      coalesce(o.orientacao IN ('Sim', 'Não') AND vt.voto <> o.orientacao, false) AS dissidente
    FROM votos vt JOIN deputados d ON d.id = vt.deputado_id
    LEFT JOIN orientacao_partido o ON o.votacao_id = vt.votacao_id AND o.partido = vt.partido_na_data
    WHERE vt.votacao_id = ? ORDER BY dissidente DESC, vt.partido_na_data, d.nome`, params: [id] };
}

export function sqlPlacarPartidos(id: string): Consulta {
  return { sql: `SELECT vt.partido_na_data AS partido, count(*) AS total, count(*) FILTER (vt.voto = 'Sim') AS sim,
      count(*) FILTER (vt.voto = 'Não') AS nao, count(*) FILTER (vt.voto NOT IN ('Sim', 'Não')) AS outros,
      any_value(o.orientacao) AS orientacao
    FROM votos vt LEFT JOIN orientacao_partido o ON o.votacao_id = vt.votacao_id AND o.partido = vt.partido_na_data
    WHERE vt.votacao_id = ? GROUP BY 1 ORDER BY total DESC`, params: [id] };
}

export function sqlOrientacoes(id: string): Consulta {
  return { sql: "SELECT bancada, orientacao FROM orientacoes WHERE votacao_id = ? ORDER BY bancada = 'Governo' DESC, bancada", params: [id] };
}

export function sqlVotacoesMensal(f: Filtros): Consulta {
  const c: string[] = [];
  const p: unknown[] = [];
  periodo(f, "data", c, p);
  if (f.orgao) { c.push("sigla_orgao = ?"); p.push(f.orgao); }
  return { sql: `SELECT strftime(data, '%Y-%m') AS periodo, count(*) AS valor FROM votacoes
    ${c.length ? `WHERE ${c.join(" AND ")}` : ""} GROUP BY 1 ORDER BY 1`, params: p };
}
