import type { Grupo, NomeIndicador } from "./types";

/** Valor por UF pela mediana dos deputados (robusta a quem tem números extremos). */
export function valoresPorUf(ufs: Record<string, Grupo>, indicador: NomeIndicador): Record<string, number | null> {
  return Object.fromEntries(Object.entries(ufs).map(([uf, g]) => [uf, g[indicador]?.mediana ?? null]));
}

function quantil(ord: number[], q: number) {
  const pos = (ord.length - 1) * q;
  const b = Math.floor(pos);
  return ord[b] + (ord[Math.min(b + 1, ord.length - 1)] - ord[b]) * (pos - b);
}

/** Faixas por quantil: cada classe tem aproximadamente o mesmo número de UFs. */
export function faixas(valores: Record<string, number | null>, n: number) {
  const ord = Object.values(valores).filter((v): v is number => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
  const limites = ord.length ? Array.from({ length: n + 1 }, (_, i) => quantil(ord, i / n)) : [];
  const classe = (v: number) => {
    for (let i = 1; i < n; i++) if (v < limites[i]) return i - 1;
    return n - 1;
  };
  return { limites, classe };
}
