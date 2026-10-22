import type { Pico } from "./types";

/** Mesma regra do pipeline (metrics/series.py): mediana + 3×MAD escalado OU > 2,5× a média dos 12 meses anteriores. */
const ESCALA_MAD = 1.4826;

function mediana(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function detectarPicos(pontos: { periodo: string; valor: number }[]): Pico[] {
  if (!pontos.length) return [];
  const vals = pontos.map((p) => p.valor);
  const med = mediana(vals);
  const mad = ESCALA_MAD * mediana(vals.map((v) => Math.abs(v - med)));
  const picos: Pico[] = [];
  pontos.forEach(({ periodo, valor: v }, i) => {
    if (v <= 0) return;
    const ant = vals.slice(Math.max(0, i - 12), i);
    const mediaAnt = ant.length >= 6 ? ant.reduce((s, x) => s + x, 0) / ant.length : 0;
    const porMad = mad > 0 && v > med + 3 * mad;
    const porMedia = mediaAnt > 0 && v > 2.5 * mediaAnt;
    if (!porMad && !porMedia) return;
    const base = mediaAnt > 0 ? mediaAnt : med;
    const fator = base > 0 ? Math.round((v / base) * 10) / 10 : null;
    picos.push({ periodo, valor: v, fator, rotulo: fator ? `pico: ${fator.toFixed(1).replace(".", ",")}× a média` : "pico" });
  });
  return picos;
}
