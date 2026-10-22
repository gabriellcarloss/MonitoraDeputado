import { beforeAll, describe, expect, it } from "vitest";
import { sqlPresencaDeputado, sqlVotosDeputado } from "@/lib/queries/deputado";
import { conectar } from "./helpers/duck-node";

let db: Awaited<ReturnType<typeof conectar>>;
beforeAll(async () => { db = await conectar(); });

describe("queries do perfil", () => {
  it("votos do deputado trazem orientação do partido e do governo e flag de alinhamento", async () => {
    const c = sqlVotosDeputado(1, 500);
    const r = await db.query<{ voto: string; orientacao_partido: string | null; seguiu_partido: boolean | null }>(c.sql, c.params);
    expect(r.length).toBeGreaterThan(0);
    for (const v of r) {
      if (v.orientacao_partido === "Sim" || v.orientacao_partido === "Não") expect(v.seguiu_partido).toBe(v.voto === v.orientacao_partido);
      else expect(v.seguiu_partido).toBeNull();
    }
  });
  it("presença do deputado: uma linha por sessão em exercício", async () => {
    const c = sqlPresencaDeputado(1);
    const r = await db.query<{ data: string; presente: boolean }>(c.sql, c.params);
    const [{ n }] = await db.query<{ n: number }>("SELECT count(*) AS n FROM presencas WHERE deputado_id = 1");
    expect(r.length).toBe(n);
  });
});

describe("orientação resolvida por partido (federações e blocos)", () => {
  it("usa orientacao_partido", async () => {
    const c = sqlVotosDeputado(1, 50);
    const r = await db.query<{ votacao_id: string; partido: string; orientacao_partido: string | null }>(c.sql, c.params);
    for (const v of r.slice(0, 10)) {
      const o = await db.query<{ orientacao: string }>("SELECT orientacao FROM orientacao_partido WHERE votacao_id = ? AND partido = ?", [v.votacao_id, v.partido]);
      expect(v.orientacao_partido).toBe(o[0]?.orientacao ?? null);
    }
  });
});
