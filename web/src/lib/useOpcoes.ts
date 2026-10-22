"use client";

import { useMemo } from "react";
import { UFS } from "./indicadores";
import type { DeputadoResumo } from "./types";
import { useJson } from "./useJson";

/** Opções de filtro (UFs e partidos existentes) e índice de deputados por id. */
export function useOpcoes() {
  const { dados } = useJson<DeputadoResumo[]>("/data/deputados.json");
  return useMemo(() => ({
    opcoes: { ufs: UFS, partidos: Array.from(new Set((dados ?? []).map((d) => d.partido_atual))).sort() },
    deputados: new Map((dados ?? []).map((d) => [d.id, d])),
    pronto: !!dados,
  }), [dados]);
}
