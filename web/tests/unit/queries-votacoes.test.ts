import { beforeAll, describe, expect, it } from "vitest";
import { sqlRankingPresenca, sqlPresencaMensal } from "@/lib/queries/presenca";
import { sqlProposicoes, sqlRankingAutores } from "@/lib/queries/proposicoes";
import { sqlPlacarPartidos, sqlVotacoes, sqlVotosDaVotacao } from "@/lib/queries/votacoes";
import { conectar } from "./helpers/duck-node";

let db: Awaited<ReturnType<typeof conectar>>;
beforeAll(async () => { db = await conectar(); });
const run = <T,>(c: { sql: string; params: unknown[] }) => db.query<T>(c.sql, c.params);

describe("votações", () => {
  it("lista respeita período e traz contagem de votos", async () => {
    const r = await run<{ data: unknown; n_votos: number }>(sqlVotacoes({ inicio: "2024-01", fim: "2024-06" }));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((v) => v.n_votos > 0)).toBe(true);
  });
  it("dissidente = voto diferente da orientação Sim/Não do próprio partido", async () => {
    const [v] = await run<{ id: string }>(sqlVotacoes({}));
    const votos = await run<{ voto: string; orientacao_partido: string | null; dissidente: boolean }>(sqlVotosDaVotacao(v.id));
    for (const x of votos) {
      const esperado = (x.orientacao_partido === "Sim" || x.orientacao_partido === "Não") && x.voto !== x.orientacao_partido;
      expect(x.dissidente).toBe(esperado);
    }
    const placar = await run<{ partido: string; total: number }>(sqlPlacarPartidos(v.id));
    expect(placar.reduce((s, p) => s + p.total, 0)).toBe(votos.length);
  });
});

describe("presença", () => {
  it("ranking ordena por % e respeita filtro de partido", async () => {
    const r = await run<{ partido: string; pct: number }>(sqlRankingPresenca({ partido: "PALF" }, "asc"));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.partido === "PALF")).toBe(true);
    for (let i = 1; i < r.length; i++) expect(r[i].pct).toBeGreaterThanOrEqual(r[i - 1].pct);
  });
  it("série mensal entre 0 e 1", async () => {
    const r = await run<{ valor: number }>(sqlPresencaMensal({}));
    expect(r.every((x) => x.valor >= 0 && x.valor <= 1)).toBe(true);
  });
});

describe("proposições", () => {
  it("filtro por tipo e autor principal", async () => {
    const r = await run<{ sigla_tipo: string; autor: string | null }>(sqlProposicoes({ tipo: "PEC" }, 100, 0));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.sigla_tipo === "PEC")).toBe(true);
  });
  it("ranking de autores só conta relevantes como autor principal", async () => {
    const [top] = await run<{ deputado_id: number; n: number }>(sqlRankingAutores({}, 1));
    const [{ n }] = await db.query<{ n: number }>(
      "SELECT count(*) AS n FROM autorias a JOIN proposicoes p ON p.id = a.proposicao_id WHERE a.deputado_id = ? AND a.proponente_principal AND p.relevante",
      [top.deputado_id]);
    expect(top.n).toBe(n);
  });
});
