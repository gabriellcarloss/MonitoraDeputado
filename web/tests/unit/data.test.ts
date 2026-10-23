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
    expect(m?.regras.length).toBe(21);
    expect(typeof m?.ficticio).toBe("boolean");
  });
});

describe("dados da fase 3", () => {
  it("perfil traz equipe e emendas; resumo traz os totais", () => {
    const id = getDeputadoIds()[0];
    const d = getDeputado(id)!;
    expect(d.gabinete?.n).toBeGreaterThan(0);
    expect(d.emendas?.empenhado).toBeGreaterThan(0);
    expect(getDeputados()[0].n_secretarios).toBeGreaterThan(0);
    expect(getBrasil()!.totais.emendas_empenhado).toBeGreaterThan(0);
  });
  it("ausências justificadas aparecem no parquet e nos indicadores", async () => {
    const db = await conectar();
    const [r] = await db.query<{ n: number }>("SELECT count(*)::INT AS n FROM presencas WHERE justificada");
    expect(r.n).toBeGreaterThan(0);
    expect(getDeputados().some((d) => (d.indicadores?.n_faltas_justificadas ?? 0) > 0)).toBe(true);
  });
});

describe("parquet (mesmo SQL do navegador)", () => {
  it("soma das despesas bate com brasil.json", async () => {
    const db = await conectar();
    const [r] = await db.query<{ total: number }>("SELECT sum(valor_liquido) AS total FROM despesas");
    expect(r.total).toBeCloseTo(getBrasil()!.totais.gasto_total, 2);
  });
});
