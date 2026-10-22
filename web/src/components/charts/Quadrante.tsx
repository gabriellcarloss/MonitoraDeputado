"use client";

import type { EChartsOption } from "echarts";
import { useRouter } from "next/navigation";
import { brl, brlCurto, num } from "@/lib/format";
import { Cartao, TabelaSimples } from "./Cartao";
import { eixoBase, tooltipBase, useCores } from "./cores";
import { EChart } from "./EChart";

export interface PontoQuadrante {
  id: number;
  nome: string;
  partido: string;
  uf: string;
  x: number; // gasto
  y: number; // entrega
}

function mediana(v: number[]) {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
}
function quantil(v: number[], q: number) {
  const s = [...v].sort((a, b) => a - b);
  if (!s.length) return 0;
  const pos = (s.length - 1) * q;
  const b = Math.floor(pos);
  return s[b] + (s[Math.min(b + 1, s.length - 1)] - s[b]) * (pos - b);
}

/** Dispersão custo × entrega: quem gasta muito e entrega pouco fica destacado (quadrante inferior direito). */
export function Quadrante({ pontos, xLabel = "Gasto da cota", yLabel = "Proposições relevantes (autor)" }: {
  pontos: PontoQuadrante[]; xLabel?: string; yLabel?: string;
}) {
  const c = useCores();
  const router = useRouter();
  const mx = mediana(pontos.map((p) => p.x));
  const my = mediana(pontos.map((p) => p.y));
  const g75 = quantil(pontos.map((p) => p.x), 0.75);
  const e25 = quantil(pontos.map((p) => p.y), 0.25);
  const critico = (p: PontoQuadrante) => p.x >= g75 && p.y <= e25 && p.x > 0;
  const grupos = [
    { nome: "Gasta muito e entrega pouco", cor: c.alta, dados: pontos.filter(critico) },
    { nome: "Demais deputados", cor: c.series[1], dados: pontos.filter((p) => !critico(p)) },
  ];
  const option: EChartsOption = {
    grid: { left: 8, right: 40, top: 64, bottom: 32, containLabel: true },
    legend: { top: 0, left: 0, textStyle: { color: c.muted } },
    tooltip: { trigger: "item", ...tooltipBase(c), formatter: (x: unknown) => {
      const p = (x as { data: { p: PontoQuadrante } }).data.p;
      return `<b>${p.nome}</b> (${p.partido}-${p.uf})<br/>Gasto: ${brl(p.x)}<br/>Proposições: ${num(p.y)}`;
    } },
    xAxis: { type: "value", name: xLabel, nameLocation: "middle", nameGap: 24, nameTextStyle: { color: c.muted },
      ...eixoBase(c), axisLabel: { color: c.muted, formatter: brlCurto } },
    yAxis: { type: "value", name: yLabel, nameGap: 14, nameTextStyle: { color: c.muted, align: "left" }, ...eixoBase(c), axisLine: { show: false } },
    series: grupos.map((g, i) => ({
      name: g.nome, type: "scatter", symbolSize: 9, cursor: "pointer",
      itemStyle: { color: g.cor, borderColor: c.superficie, borderWidth: 1.5, opacity: 0.9 },
      emphasis: { scale: 1.6 },
      data: g.dados.map((p) => ({ value: [p.x, p.y], p })),
      markLine: i === 0 ? {
        silent: true, symbol: "none", label: { color: c.muted, fontSize: 10 },
        lineStyle: { color: c.eixo, type: "solid", width: 1, opacity: 0.6 },
        data: [{ xAxis: mx, label: { formatter: "mediana", position: "insideEndTop" } },
          { yAxis: my, label: { formatter: "mediana", position: "insideEndTop" } }],
      } : undefined,
    })),
  };
  return (
    <Cartao titulo="Custo × entrega" subtitulo="Cada ponto é um deputado. Em vermelho: gasto entre os 25% maiores e proposições entre os 25% menores."
      tabela={<TabelaSimples colunas={["Deputado", "Partido-UF", "Gasto", "Proposições", "Situação"]}
        linhas={[...pontos].sort((a, b) => b.x - a.x).map((p) => [p.nome, `${p.partido}-${p.uf}`, brl(p.x), p.y,
          critico(p) ? "Gasta muito e entrega pouco" : ""])} />}>
      <EChart option={option} altura={420}
        onEvents={{ click: (x: { data: { p: PontoQuadrante } }) => router.push(`/deputado/${x.data.p.id}/`) }} />
    </Cartao>
  );
}
