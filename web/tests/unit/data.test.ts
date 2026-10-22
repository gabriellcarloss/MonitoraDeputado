import { describe, expect, it } from "vitest";
import { getBrasil, getDeputado, getDeputadoIds, getDeputados, getMeta } from "@/lib/data";
import { conectar } from "./helpers/duck-node";

describe("data (build-time)", () => {
  it("getDeputado inexistente devolve null", () => {
    expect(getDeputado(999999)).toBeNull();
  });
  it("lista e ids batem", () => {
    const ids = getDeputadoIds();
    expect(ids.length).toBe(getDeputados().length);
    expect(getDeputado(ids[0])?.deputado.id).toBe(ids[0]);
  });
  it("meta tem regras e flag fictício", () => {
    const m = getMeta();
    expect(m?.regras.length).toBe(16);
    expect(typeof m?.ficticio).toBe("boolean");
  });
});

describe("parquet (mesmo SQL do navegador)", () => {
  it("soma das despesas bate com brasil.json", async () => {
    const db = await conectar();
    const [r] = await db.query<{ total: number }>("SELECT sum(valor_liquido) AS total FROM despesas");
    expect(r.total).toBeCloseTo(getBrasil()!.totais.gasto_total, 2);
  });
});
