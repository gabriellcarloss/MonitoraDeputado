"use client";

import type { EChartsOption } from "echarts";
import { brl, brlCurto, mes, num, pct } from "@/lib/format";
import type { Pico } from "@/lib/types";
import { Cartao, TabelaSimples } from "./Cartao";
import { ANIMACAO, comAlfa, eixoBase, gradBarra, gradV, tooltipBase, useCores } from "./cores";
import { EChart } from "./EChart";

export type Formato = "brl" | "num" | "pct";
export interface Linha {
  nome: string;
  pontos: { periodo: string; valor: number }[];
  picos?: Pico[];
}

const FMT: Record<Formato, (v: number) => string> = { brl, num, pct: (v) => pct(v) };
const FMT_EIXO: Record<Formato, (v: number) => string> = { brl: brlCurto, num, pct: (v) => pct(v, 0) };

function rotuloPeriodo(p: string) {
  return /^\d{4}-\d{2}$/.test(p) ? mes(p) : p.length === 10 ? `${p.slice(8)}/${p.slice(5, 7)}/${p.slice(2, 4)}` : p;
}

/**
 * Série temporal mensal com picos anotados. A primeira linha é a principal (recebe os picos);
 * as demais são referências (média do partido, UF, Brasil). Nunca usa dois eixos.
 */
export function SerieTemporal({ titulo, subtitulo, linhas, formato = "num", altura = 300, barras = false }: {
  titulo: string; subtitulo?: string; linhas: Linha[]; formato?: Formato; altura?: number; barras?: boolean;
}) {
  const c = useCores();
  const periodos = Array.from(new Set(linhas.flatMap((l) => l.pontos.map((p) => p.periodo)))).sort();
  const vazio = periodos.length === 0;
  const fmt = FMT[formato];
  const option: EChartsOption = {
    ...ANIMACAO,
    grid: { left: 8, right: 16, top: linhas.length > 1 ? 36 : 16, bottom: periodos.length > 24 ? 56 : 8, containLabel: true },
    legend: linhas.length > 1 ? { top: 0, left: 0, textStyle: { color: c.muted }, itemWidth: 14, itemHeight: 3, icon: "rect" } : undefined,
    tooltip: {
      trigger: "axis", ...tooltipBase(c),
      axisPointer: barras ? { type: "shadow", shadowStyle: { color: comAlfa(c.series[0], 0.08) } } : { type: "line", lineStyle: { color: comAlfa(c.series[0], 0.6), width: 1.5, type: "dashed" } },
      valueFormatter: (v) => (typeof v === "number" ? fmt(v) : "—"),
    },
    xAxis: { type: "category", data: periodos, boundaryGap: barras, ...eixoBase(c), splitLine: { show: false },
      axisLabel: { color: c.muted, fontSize: 11, formatter: rotuloPeriodo, hideOverlap: true } },
    yAxis: { type: "value", ...eixoBase(c), axisLine: { show: false }, axisLabel: { color: c.muted, fontSize: 11, formatter: FMT_EIXO[formato] } },
    dataZoom: periodos.length > 24
      ? [{ type: "inside" }, { type: "slider", height: 18, bottom: 8, borderColor: c.grade, textStyle: { color: c.muted } }]
      : undefined,
    series: linhas.map((l, i) => {
      const mapa = new Map(l.pontos.map((p) => [p.periodo, p.valor]));
      return {
        name: l.nome,
        type: barras && i === 0 ? "bar" : "line",
        data: periodos.map((p) => mapa.get(p) ?? null),
        showSymbol: false, symbol: "circle", symbolSize: 9, connectNulls: false, smooth: 0.25,
        barMaxWidth: 18,
        itemStyle: barras && i === 0
          ? { color: gradBarra(c.series[0], false), borderRadius: [6, 6, 0, 0] }
          : { color: c.series[i % c.series.length], borderColor: c.superficie, borderWidth: 2 },
        lineStyle: i === 0
          ? { width: 3, shadowColor: comAlfa(c.series[0], 0.45), shadowBlur: 12, shadowOffsetY: 6 }
          : { width: 1.75, opacity: 0.85, type: i > 1 ? ("dashed" as const) : ("solid" as const) },
        ...(i === 0 && !barras ? { areaStyle: { color: gradV(c.series[0], 0.32, 0.01) } } : {}),
        emphasis: { focus: "series", itemStyle: barras ? { color: c.series[0], shadowBlur: 14, shadowColor: comAlfa(c.series[0], 0.5) } : undefined },
        markPoint: i === 0 && l.picos?.length ? {
          symbol: "pin", symbolSize: 36, animationDelay: 1200,
          itemStyle: { color: c.alta, borderColor: c.superficie, borderWidth: 2 },
          label: { show: true, formatter: "!", color: "#fff", fontWeight: "bold" },
          data: l.picos.map((p) => ({ coord: [p.periodo, p.valor], value: p.rotulo, name: p.rotulo })),
          tooltip: { formatter: (x: unknown) => {
            const d = x as { name: string; data: { coord: [string, number] } };
            return `${rotuloPeriodo(d.data.coord[0])}: ${fmt(d.data.coord[1])}<br/><b>${d.name}</b>`;
          } },
        } : undefined,
      };
    }),
  };
  const principal = linhas[0];
  const picosTexto = principal?.picos?.length
    ? `Picos: ${principal.picos.map((p) => `${rotuloPeriodo(p.periodo)} (${p.rotulo.replace("pico: ", "")})`).join(" · ")}`
    : undefined;
  return (
    <Cartao titulo={titulo} subtitulo={subtitulo ?? picosTexto}
      dados={vazio ? undefined : { colunas: ["Período", ...linhas.map((l) => l.nome)],
        linhas: periodos.map((p) => [p, ...linhas.map((l) => l.pontos.find((x) => x.periodo === p)?.valor ?? null)]) }}
      tabela={vazio ? undefined : <TabelaSimples colunas={["Período", ...linhas.map((l) => l.nome)]}
        linhas={periodos.map((p) => [rotuloPeriodo(p), ...linhas.map((l) => {
          const v = l.pontos.find((x) => x.periodo === p)?.valor;
          return v === undefined ? "—" : fmt(v);
        })])} />}>
      {vazio ? <p className="py-10 text-center text-sm text-muted">Sem registros no período.</p> : <EChart option={option} altura={altura} />}
    </Cartao>
  );
}
