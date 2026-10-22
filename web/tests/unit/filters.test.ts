import { describe, expect, it } from "vitest";
import { paraQuery, parseFiltros } from "@/lib/filters";

const opcoes = { ufs: ["SP", "RJ"], partidos: ["PT", "PL"] };

describe("parseFiltros", () => {
  it("descarta UF inválida e mantém partido válido", () => {
    const f = parseFiltros(new URLSearchParams("uf=XX&partido=PT"), opcoes);
    expect(f.uf).toBeUndefined();
    expect(f.partido).toBe("PT");
  });
  it("partido inexistente é descartado", () => {
    expect(parseFiltros(new URLSearchParams("partido=ZZZ"), opcoes).partido).toBeUndefined();
  });
  it("período invertido é trocado", () => {
    const f = parseFiltros(new URLSearchParams("inicio=2025-06&fim=2024-01"), opcoes);
    expect([f.inicio, f.fim]).toEqual(["2024-01", "2025-06"]);
  });
  it("período mal formatado é ignorado", () => {
    expect(parseFiltros(new URLSearchParams("inicio=junho"), opcoes).inicio).toBeUndefined();
  });
  it("faixa de gasto não numérica é ignorada", () => {
    const f = parseFiltros(new URLSearchParams("gasto_min=abc&gasto_max=5000"), opcoes);
    expect(f.gasto_min).toBeUndefined();
    expect(f.gasto_max).toBe(5000);
  });
  it("cnpj só com dígitos", () => {
    expect(parseFiltros(new URLSearchParams("cnpj=12.345.678/0001-90"), opcoes).cnpj).toBe("12345678000190");
  });
  it("paraQuery ignora vazios", () => {
    expect(paraQuery({ uf: "SP", partido: undefined, inicio: "2024-01" })).toBe("?uf=SP&inicio=2024-01");
    expect(paraQuery({})).toBe("");
  });
});

describe("filtros de alertas", () => {
  it("regra e severidade válidas", () => {
    const f = parseFiltros(new URLSearchParams("regra=g04&severidade=alta"), opcoes);
    expect(f.regra).toBe("G04");
    expect(f.severidade).toBe("alta");
  });
  it("valores inválidos descartados", () => {
    const f = parseFiltros(new URLSearchParams("regra=DROP&severidade=urgente"), opcoes);
    expect(f.regra).toBeUndefined();
    expect(f.severidade).toBeUndefined();
  });
});
