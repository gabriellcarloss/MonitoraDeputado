"use client";

import { useState } from "react";
import { Mapa3D } from "@/components/charts/Mapa3D";
import { type PontoQuadrante, Quadrante } from "@/components/charts/Quadrante";
import { brl, ouTraco, pct } from "@/lib/format";
import type { Grupo } from "@/lib/types";

type MetricaMapa = "gasto" | "presenca" | "projetos";
const METRICAS: Record<MetricaMapa, { rotulo: string; campo: keyof Grupo; fmt: (v: number) => string }> = {
  gasto: { rotulo: "Gasto médio por deputado", campo: "gasto_total", fmt: brl },
  presenca: { rotulo: "Presença média em sessões", campo: "pct_presenca_sessoes", fmt: (v) => pct(v) },
  projetos: { rotulo: "Projetos por deputado", campo: "n_proposicoes_relevantes", fmt: (v) => ouTraco(v, (x) => x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })) },
};

export function MapaUfs({ ufs }: { ufs: Record<string, Grupo> }) {
  const [m, setM] = useState<MetricaMapa>("gasto");
  const info = METRICAS[m];
  const valores = Object.fromEntries(Object.entries(ufs).map(([uf, g]) => {
    const e = g[info.campo] as { media: number | null };
    return [uf, e?.media ?? null];
  }));
  return (
    <Mapa3D titulo="Mapa 3D por estado" subtitulo={`${info.rotulo}. Altura e cor proporcionais ao valor.`} valores={valores} formato={info.fmt}
      onSelecionar={(uf) => { window.location.href = `/deputados/?uf=${uf}`; }}
      acoes={
        <div className="flex flex-wrap gap-1" role="group" aria-label="Métrica do mapa">
          {(Object.keys(METRICAS) as MetricaMapa[]).map((k) => (
            <button key={k} type="button" onClick={() => setM(k)} aria-pressed={m === k} className="pilula h-7 px-2.5 text-xs">
              {k === "gasto" ? "Gasto" : k === "presenca" ? "Presença" : "Projetos"}
            </button>
          ))}
        </div>
      } />
  );
}

export function QuadranteInicio({ pontos }: { pontos: PontoQuadrante[] }) {
  return <Quadrante pontos={pontos} />;
}

