import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buscarJson, chaveConsulta, comTentativas, guardarResultado, lerResultado, MAX_ENTRADAS } from "@/lib/resiliencia";

function cacheFalso() {
  const mapa = new Map<string, Response>();
  return {
    mapa,
    caches: {
      open: async () => ({
        put: async (url: string, r: Response) => { mapa.set(url, r); },
        match: async (url: string) => mapa.get(url)?.clone(),
      }),
    },
  };
}

describe("resiliência", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("tenta de novo e devolve o resultado quando uma tentativa dá certo", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("a")).mockResolvedValue("ok");
    await expect(comTentativas(fn, [0, 0])).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("lança o último erro quando todas as tentativas falham", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("falhou"));
    await expect(comTentativas(fn, [0, 0])).rejects.toThrow("falhou");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("usa a cópia guardada quando a rede falha", async () => {
    const c = cacheFalso();
    c.mapa.set("/data/x.json", new Response(JSON.stringify({ a: 1 })));
    vi.stubGlobal("caches", c.caches);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede")));
    const eventos: string[] = [];
    window.addEventListener("md:dados", (e) => eventos.push((e as CustomEvent<string>).detail));
    await expect(buscarJson("/data/x.json", [0])).resolves.toEqual({ a: 1 });
    expect(eventos).toContain("desatualizado");
  });

  it("sem rede e sem cópia, o erro aparece", async () => {
    vi.stubGlobal("caches", cacheFalso().caches);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede")));
    await expect(buscarJson("/data/y.json", [0])).rejects.toThrow("rede");
  });

  it("guarda e lê o resultado de uma consulta", () => {
    const k = chaveConsulta("select 1", [1]);
    expect(lerResultado(k)).toBeNull();
    guardarResultado(k, [{ a: 1 }]);
    expect(lerResultado(k)).toEqual([{ a: 1 }]);
    expect(chaveConsulta("select 1", [2])).not.toBe(k);
  });

  it("descarta as entradas mais antigas", () => {
    for (let i = 0; i < MAX_ENTRADAS + 5; i++) guardarResultado(`k${i}`, [i]);
    expect(lerResultado("k0")).toBeNull();
    expect(lerResultado(`k${MAX_ENTRADAS + 4}`)).toEqual([MAX_ENTRADAS + 4]);
  });
});
