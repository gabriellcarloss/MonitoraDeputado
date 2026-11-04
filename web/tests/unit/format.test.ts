import { describe, expect, it } from "vitest";
import { brl, data, humanizar, iso, mes, num, ouTraco, pct } from "@/lib/format";

describe("format", () => {
  it("brl", () => {
    expect(brl(1234.56)).toBe("R$ 1.234,56");
    expect(brl(-200)).toBe("-R$ 200,00");
  });
  it("pct", () => {
    expect(pct(0.1234)).toBe("12,3%");
    expect(pct(1, 0)).toBe("100%");
  });
  it("mes", () => {
    expect(mes("2025-01")).toBe("jan/2025");
    expect(mes("2024-12")).toBe("dez/2024");
  });
  it("data", () => {
    expect(data("2024-03-05")).toBe("05/03/2024");
    expect(data(null)).toBe("—");
  });
  it("humanizar troca datas ISO soltas por formato brasileiro", () => {
    expect(humanizar("Picos de gasto em: 2023-04, 2023-05")).toBe("Picos de gasto em: abr/2023, mai/2023");
    expect(humanizar("aberta em 2024-03-05")).toBe("aberta em 05/03/2024");
    expect(humanizar("Lei 2023-99 e R$ 1.234")).toBe("Lei 2023-99 e R$ 1.234");
    expect(humanizar(null)).toBe("");
  });
  it("num", () => expect(num(1234)).toBe("1.234"));
  it("ouTraco", () => {
    expect(ouTraco(null, brl)).toBe("—");
    expect(ouTraco(undefined, brl)).toBe("—");
    expect(ouTraco(Infinity, brl)).toBe("—");
    expect(ouTraco(Number.NaN, pct)).toBe("—");
    expect(ouTraco(10, brl)).toBe("R$ 10,00");
  });
});

describe("datas vindas do DuckDB/Arrow", () => {
  it("data aceita epoch em ms e Date", () => {
    expect(data(Date.UTC(2024, 2, 5) as unknown as string)).toBe("05/03/2024");
    expect(data(new Date(Date.UTC(2024, 2, 5)) as unknown as string)).toBe("05/03/2024");
  });
  it("iso normaliza para AAAA-MM-DD", () => {
    expect(iso(Date.UTC(2024, 11, 31))).toBe("2024-12-31");
    expect(iso("2024-12-31T10:00:00")).toBe("2024-12-31");
    expect(iso(null)).toBeNull();
  });
});
