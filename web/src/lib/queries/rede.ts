import type { Consulta } from "./base";

/** Arestas deputado → fornecedor dos K fornecedores pagos por mais deputados (mínimo N). */
export function sqlRedeFornecedoresCompartilhados(minDeputados: number, k: number): Consulta {
  return { sql: `WITH f AS (
      SELECT destino_id AS fornecedor, count(DISTINCT origem_id) AS n_deputados, sum(valor) AS total
      FROM rede_arestas WHERE origem_tipo = 'deputado' AND destino_tipo = 'fornecedor'
      GROUP BY 1 HAVING count(DISTINCT origem_id) >= ? ORDER BY n_deputados DESC, total DESC LIMIT ?)
    SELECT f.fornecedor, f.n_deputados, coalesce(fo.razao_social, f.fornecedor) AS nome_fornecedor,
      a.origem_id AS deputado_id, d.nome AS nome_deputado, a.valor, a.n
    FROM f JOIN rede_arestas a ON a.destino_tipo = 'fornecedor' AND a.destino_id = f.fornecedor AND a.origem_tipo = 'deputado'
    LEFT JOIN fornecedores fo ON fo.cnpj = f.fornecedor LEFT JOIN deputados d ON d.id::VARCHAR = a.origem_id`,
    params: [minDeputados, k] };
}

export function sqlPassageirosCompartilhados(minGabinetes: number): Consulta {
  return { sql: `SELECT a.destino_id AS passageiro, count(DISTINCT a.origem_id) AS gabinetes, sum(a.valor) AS valor, sum(a.n) AS passagens,
      string_agg(DISTINCT d.nome, ', ') AS deputados
    FROM rede_arestas a LEFT JOIN deputados d ON d.id::VARCHAR = a.origem_id
    WHERE a.origem_tipo = 'deputado' AND a.destino_tipo = 'passageiro'
    GROUP BY 1 HAVING count(DISTINCT a.origem_id) >= ? ORDER BY gabinetes DESC, valor DESC`, params: [minGabinetes] };
}

export function sqlArestasPassageiros(minGabinetes: number): Consulta {
  return { sql: `WITH p AS (SELECT destino_id FROM rede_arestas WHERE origem_tipo = 'deputado' AND destino_tipo = 'passageiro'
      GROUP BY 1 HAVING count(DISTINCT origem_id) >= ?)
    SELECT a.origem_id AS deputado_id, d.nome AS nome_deputado, a.destino_id AS passageiro, a.valor, a.n
    FROM rede_arestas a JOIN p ON p.destino_id = a.destino_id LEFT JOIN deputados d ON d.id::VARCHAR = a.origem_id
    WHERE a.origem_tipo = 'deputado' AND a.destino_tipo = 'passageiro'`, params: [minGabinetes] };
}
