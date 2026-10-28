"use client";

import type { EChartsOption } from "echarts";
import { brl, brlCurto, mes, num, pct } from "@/lib/format";
import type { Pico } from "@/lib/types";
import { Cartao, TabelaSimples } from "./Cartao";
import { eixoBase, tooltipBase, useCores } from "./cores";
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
    animationDuration: 300,
    grid: { left: 8, right: 16, top: linhas.length > 1 ? 36 : 16, bottom: periodos.length > 24 ? 56 : 8, containLabel: true },
    legend: linhas.length > 1 ? { top: 0, left: 0, textStyle: { color: c.muted }, itemWidth: 14, itemHeight: 3, icon: "rect" } : undefined,
    tooltip: {
      trigger: "axis", ...tooltipBase(c), axisPointer: { type: "line", lineStyle: { color: c.eixo } },
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
        showSymbol: false, symbolSize: 8, connectNulls: false,
        barMaxWidth: 18,
        itemStyle: { color: c.series[i % c.series.length], borderRadius: barras && i === 0 ? [4, 4, 0, 0] : 0 },
        lineStyle: { width: i === 0 ? 2.5 : 1.75, opacity: i === 0 ? 1 : 0.85 },
        ...(i === 0 && !barras ? { areaStyle: { opacity: 0.1 } } : {}),
        emphasis: { focus: "series" },
        markPoint: i === 0 && l.picos?.length ? {
          symbol: "pin", symbolSize: 34,
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
      tabela={vazio ? undefined : <TabelaSimples colunas={["Período", ...linhas.map((l) => l.nome)]}
        linhas={periodos.map((p) => [rotuloPeriodo(p), ...linhas.map((l) => {
          const v = l.pontos.find((x) => x.periodo === p)?.valor;
          return v === undefined ? "—" : fmt(v);
        })])} />}>
      {vazio ? <p className="py-10 text-center text-sm text-muted">Sem registros no período.</p> : <EChart option={option} altura={altura} />}
    </Cartao>
  );
}
