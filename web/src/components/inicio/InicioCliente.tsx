"use client";

import { useState } from "react";
import { Mapa3D } from "@/components/charts/Mapa3D";
import { type PontoQuadrante, Quadrante } from "@/components/charts/Quadrante";
import { brl, brlCurto, ouTraco, pct } from "@/lib/format";
import { valoresPorUf } from "@/lib/mapa";
import type { Grupo, NomeIndicador } from "@/lib/types";

type MetricaMapa = "gasto" | "presenca" | "projetos";
const METRICAS: Record<MetricaMapa, { rotulo: string; campo: NomeIndicador; fmt: (v: number) => string; curto?: (v: number) => string }> = {
  gasto: { rotulo: "Gasto mensal típico por deputado (mediana)", campo: "gasto_medio_mensal", fmt: brl, curto: brlCurto },
  presenca: { rotulo: "Presença típica em sessões (mediana)", campo: "pct_presenca_sessoes", fmt: (v) => pct(v) },
  projetos: { rotulo: "Projetos apresentados por deputado (mediana)", campo: "n_proposicoes_relevantes", fmt: (v) => ouTraco(v, (x) => x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })) },
};

export function MapaUfs({ ufs }: { ufs: Record<string, Grupo> }) {
  const [m, setM] = useState<MetricaMapa>("gasto");
  const info = METRICAS[m];
  const valores = valoresPorUf(ufs, info.campo);
  return (
    <Mapa3D titulo="Mapa por estado" subtitulo={info.rotulo} valores={valores} formato={info.fmt} formatoCurto={info.curto}
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

