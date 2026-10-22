import type { Consulta } from "./base";

export function sqlVotosDeputado(id: number, limite: number): Consulta {
  return { sql: `SELECT v.id AS votacao_id, v.data, v.sigla_orgao, v.descricao, vt.voto, vt.partido_na_data AS partido,
      op.orientacao AS orientacao_partido, og.orientacao AS orientacao_governo,
      CASE WHEN op.orientacao IN ('Sim', 'Não') THEN vt.voto = op.orientacao END AS seguiu_partido,
      CASE WHEN og.orientacao IN ('Sim', 'Não') THEN vt.voto = og.orientacao END AS seguiu_governo
    FROM votos vt JOIN votacoes v ON v.id = vt.votacao_id
    LEFT JOIN orientacao_partido op ON op.votacao_id = vt.votacao_id AND op.partido = vt.partido_na_data
    LEFT JOIN orientacoes og ON og.votacao_id = vt.votacao_id AND og.bancada = 'Governo'
    WHERE vt.deputado_id = ? ORDER BY v.data DESC LIMIT ?`, params: [id, limite] };
}

export function sqlPresencaDeputado(id: number): Consulta {
  return { sql: `SELECT s.id, s.data, s.tipo, p.presente FROM presencas p JOIN sessoes s ON s.id = p.sessao_id
    WHERE p.deputado_id = ? ORDER BY s.data`, params: [id] };
}

/** Série mensal de gasto de até 4 deputados (ids como texto, chave da tabela series). */
export function sqlSeriesGasto(ids: number[]): Consulta {
  const marcadores = ids.map(() => "?").join(", ");
  return { sql: `SELECT chave, periodo, valor FROM series WHERE escopo = 'deputado' AND metrica = 'gasto' AND chave IN (${marcadores || "NULL"})
    ORDER BY chave, periodo`, params: ids.map(String) };
}
