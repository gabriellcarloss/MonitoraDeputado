import { beforeAll, describe, expect, it } from "vitest";
import * as q from "@/lib/queries/gastos";
import { conectar } from "./helpers/duck-node";

let db: Awaited<ReturnType<typeof conectar>>;
beforeAll(async () => { db = await conectar(); });

const run = <T,>(c: { sql: string; params: unknown[] }) => db.query<T>(c.sql, c.params);

describe("queries de gastos", () => {
  it("soma por categoria com filtro de UF bate com soma direta", async () => {
    const cats = await run<{ categoria: string; valor: number }>(q.sqlPorCategoria({ uf: "SP" }));
    const [direto] = await db.query<{ t: number }>(
      "SELECT sum(e.valor_liquido) AS t FROM despesas e JOIN deputados d ON d.id = e.deputado_id WHERE d.uf = 'SP'");
    expect(cats.reduce((s, c) => s + c.valor, 0)).toBeCloseTo(direto.t, 2);
  });
  it("série mensal respeita período", async () => {
    const s = await run<{ periodo: string }>(q.sqlSerieMensal({ inicio: "2024-01", fim: "2024-03" }));
    expect(s.map((x) => x.periodo)).toEqual(["2024-01", "2024-02", "2024-03"]);
  });
  it("passageiros terceiros só traz passageiro_e_deputado = false", async () => {
    const r = await run<{ passageiro: string; n: number }>(q.sqlPassageirosTerceiros({}));
    expect(r.length).toBeGreaterThan(0);
    const [{ terceiros }] = await db.query<{ terceiros: number }>(
      "SELECT count(*) AS terceiros FROM despesas WHERE passageiro_e_deputado = false");
    expect(r.reduce((s, x) => s + x.n, 0)).toBe(terceiros);
  });
  it("notas paginadas e filtradas por deputado", async () => {
    const r = await run<{ deputado_id: number }>(q.sqlNotas({ deputado: 1 }, 50, 0));
    expect(r.length).toBeLessThanOrEqual(50);
    expect(r.every((x) => x.deputado_id === 1)).toBe(true);
    const [{ n }] = await run<{ n: number }>(q.sqlContarNotas({ deputado: 1 }));
    expect(n).toBeGreaterThan(0);
  });
  it("top fornecedores ordenados por valor", async () => {
    const r = await run<{ valor: number }>(q.sqlTopFornecedores({}, 5));
    expect(r).toHaveLength(5);
    expect(r[0].valor).toBeGreaterThanOrEqual(r[4].valor);
  });
  it("fornecedor por CNPJ traz deputados atendidos", async () => {
    const [top] = await run<{ cnpj: string }>(q.sqlTopFornecedores({}, 1));
    const deps = await run<{ deputado_id: number }>(q.sqlDeputadosDoFornecedor(top.cnpj));
    expect(deps.length).toBeGreaterThan(0);
  });
  it("nenhum valor de filtro é interpolado no SQL", () => {
    const malicioso = "SP'; DROP TABLE despesas; --";
    const c = q.sqlNotas({ uf: malicioso, categoria: malicioso, passageiro: malicioso, cnpj: "12345678000190" }, 10, 0);
    expect(c.sql).not.toContain("DROP");
    expect(c.sql).not.toContain("12345678000190");
    expect(c.params).toContain(malicioso);
  });
});
