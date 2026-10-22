import { describe, expect, it } from "vitest";
import { buscar } from "@/lib/busca";

const deps = [
  { id: 1, nome: "José da Silva", uf: "SP", partido_atual: "PALF" },
  { id: 2, nome: "Ana Souza", uf: "RJ", partido_atual: "PBET" },
];

describe("buscar", () => {
  it("deputado ignorando acento e caixa", () => {
    const r = buscar("jose", deps);
    expect(r.find((x) => x.tipo === "deputado")?.href).toBe("/deputado/1/");
  });
  it("UF e partido viram filtros", () => {
    expect(buscar("rj", deps).some((x) => x.href === "/deputados/?uf=RJ")).toBe(true);
    expect(buscar("pbet", deps).some((x) => x.href === "/deputados/?partido=PBET")).toBe(true);
  });
  it("CNPJ com 14 dígitos abre o fornecedor", () => {
    expect(buscar("12.345.678/0001-90", deps)[0].href).toBe("/fornecedor/?cnpj=12345678000190");
  });
  it("sempre oferece passageiro e fornecedor por nome", () => {
    const r = buscar("Maria Teixeira", deps);
    expect(r.some((x) => x.href === "/gastos/passagens/?passageiro=Maria%20Teixeira")).toBe(true);
    expect(r.some((x) => x.tipo === "fornecedor-nome")).toBe(true);
  });
  it("termo curto não retorna nada", () => expect(buscar("a", deps)).toEqual([]));
});
