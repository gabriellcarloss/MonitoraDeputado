import { describe, expect, it } from "vitest";
import { faixas, valoresPorUf } from "@/lib/mapa";
import type { Grupo } from "@/lib/types";

const g = (med: number, media: number) => ({ n: 8, n_proposicoes_relevantes: { media, mediana: med, soma: 0 } }) as unknown as Grupo;

describe("mapa", () => {
  it("usa a mediana (um outlier não domina a UF)", () => {
    const v = valoresPorUf({ AM: g(12, 160), SP: g(10, 11) }, "n_proposicoes_relevantes");
    expect(v).toEqual({ AM: 12, SP: 10 });
  });
  it("faixas por quantil: 5 classes, cada UF numa classe 0–4, limites crescentes", () => {
    const valores = Object.fromEntries(Array.from({ length: 27 }, (_, i) => [`U${i}`, i === 26 ? 1000 : i]));
    const f = faixas(valores, 5);
    expect(f.limites).toHaveLength(6);
    expect(f.limites.every((x, i) => i === 0 || x >= f.limites[i - 1])).toBe(true);
    expect(f.classe(0)).toBe(0);
    expect(f.classe(1000)).toBe(4);
    expect(f.classe(13)).toBe(2); // o outlier não empurra o meio para a primeira classe
  });
  it("ignora nulos", () => {
    const f = faixas({ A: null, B: 1, C: 2 }, 5);
    expect(f.limites[0]).toBe(1);
  });
});
