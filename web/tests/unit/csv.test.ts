import { describe, expect, it } from "vitest";
import { paraCsv } from "@/lib/csv";

describe("paraCsv", () => {
  it("datas do Arrow (epoch ms) saem como AAAA-MM-DD e texto é escapado", () => {
    const s = paraCsv([{ data: Date.UTC(2024, 2, 5), fornecedor: 'ACME "X"', valor: 10.5 }], ["data", "fornecedor", "valor"]);
    expect(s.split("\n")[1]).toBe('"2024-03-05";"ACME ""X""";"10.5"');
  });
});
