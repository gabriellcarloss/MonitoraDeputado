import { describe, expect, it } from "vitest";
import { detectarPicos } from "@/lib/picos";

const meses = (vs: number[], ini = 2023) => vs.map((v, i) => ({ periodo: `${ini + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`, valor: v }));

describe("detectarPicos (paridade com o pipeline)", () => {
  it("MAD", () => expect(detectarPicos(meses([10, 10, 11, 9, 10, 12, 10, 100])).map((p) => p.periodo)).toEqual(["2023-08"]));
  it("média 12 meses", () => {
    const p = detectarPicos(meses([...Array(12).fill(100), ...Array(12).fill(10), 40]));
    expect(p.map((x) => x.periodo)).toEqual(["2025-01"]);
    expect(p[0].fator).toBe(4);
  });
  it("constante e vazia", () => {
    expect(detectarPicos(meses(Array(24).fill(50)))).toEqual([]);
    expect(detectarPicos([])).toEqual([]);
  });
  it("rótulo com vírgula", () => expect(detectarPicos(meses([...Array(12).fill(10), 32]))[0].rotulo).toBe("pico: 3,2× a média"));
});
