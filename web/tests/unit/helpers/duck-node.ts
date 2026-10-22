import { DuckDBInstance } from "@duckdb/node-api";
import path from "node:path";

export const DATA_DIR = path.resolve(__dirname, "../../../public/data");

const TABELAS = ["despesas", "fornecedores", "votacoes", "votos", "orientacoes", "sessoes", "presencas", "proposicoes",
  "autorias", "relatorias", "rede_arestas", "deputados", "series", "orientacao_partido"];

/** Conexão DuckDB nativa com as mesmas views que o navegador cria — para testar o SQL do site. */
export async function conectar() {
  const inst = await DuckDBInstance.create(":memory:");
  const con = await inst.connect();
  for (const t of TABELAS) {
    await con.run(`CREATE VIEW ${t} AS SELECT * FROM read_parquet('${DATA_DIR}/parquet/${t}.parquet')`);
  }
  return {
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
      const stmt = await con.prepare(sql);
      params.forEach((p, i) => {
        if (typeof p === "number") Number.isInteger(p) ? stmt.bindBigInt(i + 1, BigInt(p)) : stmt.bindDouble(i + 1, p);
        else if (p === null) stmt.bindNull(i + 1);
        else stmt.bindVarchar(i + 1, String(p));
      });
      const r = await stmt.runAndReadAll();
      return r.getRowObjectsJS().map((o) =>
        Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v])),
      ) as T[];
    },
  };
}
