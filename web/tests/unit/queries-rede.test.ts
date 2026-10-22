import { beforeAll, describe, expect, it } from "vitest";
import { sqlPassageirosCompartilhados, sqlRedeFornecedoresCompartilhados } from "@/lib/queries/rede";
import { conectar } from "./helpers/duck-node";

let db: Awaited<ReturnType<typeof conectar>>;
beforeAll(async () => { db = await conectar(); });
const run = <T,>(c: { sql: string; params: unknown[] }) => db.query<T>(c.sql, c.params);

describe("rede global", () => {
  it("fornecedores compartilhados: só fornecedores com ao menos N deputados, limitado a K fornecedores", async () => {
    const r = await run<{ fornecedor: string; deputado_id: string; n_deputados: number }>(sqlRedeFornecedoresCompartilhados(5, 10));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.n_deputados >= 5)).toBe(true);
    expect(new Set(r.map((x) => x.fornecedor)).size).toBeLessThanOrEqual(10);
  });
  it("passageiros que voaram por mais de um gabinete", async () => {
    const r = await run<{ passageiro: string; gabinetes: number }>(sqlPassageirosCompartilhados(2));
    expect(r.every((x) => x.gabinetes >= 2)).toBe(true);
  });
});
