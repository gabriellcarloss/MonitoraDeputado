import { describe, expect, it } from "vitest";
import { gerarCsv, gerarJson, nomeArquivo } from "@/lib/exportar";

const t = { colunas: ["Nome", "Valor", "Ativo", "Nota"], linhas: [["Ana \"A\"", 1234.5, true, "=1+1"], ["Bia", null, false, "ok"]] };

describe("exportar", () => {
  it("Excel pt-BR: ponto e vírgula, vírgula decimal, aspas escapadas e sem fórmula", () => {
    const linhas = gerarCsv(t, true).split("\r\n");
    expect(linhas[0]).toBe('"Nome";"Valor";"Ativo";"Nota"');
    expect(linhas[1]).toBe('"Ana ""A""";1234,5;"sim";"\'=1+1"');
    expect(linhas[2]).toBe('"Bia";"";"não";"ok"');
  });
  it("CSV internacional: vírgula e ponto decimal", () => {
    expect(gerarCsv(t, false).split("\r\n")[1]).toBe('"Ana ""A""",1234.5,"true","\'=1+1"');
  });
  it("JSON com nomes de coluna", () => {
    expect(JSON.parse(gerarJson(t))[1]).toEqual({ Nome: "Bia", Valor: null, Ativo: false, Nota: "ok" });
  });
  it("nome de arquivo sem acento nem espaço", () => {
    expect(nomeArquivo("Emendas de João Silva")).toMatch(/^monitoradeputado-emendas-de-joao-silva-\d{4}-\d{2}-\d{2}$/);
  });
});
