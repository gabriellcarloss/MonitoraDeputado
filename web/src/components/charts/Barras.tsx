"use client";

import type { EChartsOption } from "echarts";
import { useRouter } from "next/navigation";
import { brl, brlCurto, num, pct } from "@/lib/format";
import { Cartao, TabelaSimples } from "./Cartao";
import { ANIMACAO, comAlfa, eixoBase, gradBarra, tooltipBase, useCores } from "./cores";
import { EChart } from "./EChart";
import type { Formato } from "./SerieTemporal";

export interface ItemBarra {
  rotulo: string;
  valor: number;
  href?: string;
  /** Alternativa ao link: ação ao clicar (por exemplo, filtrar a página pelo item). */
  acao?: () => void;
  detalhe?: string;
}

const FMT: Record<Formato, (v: number) => string> = { brl, num, pct: (v) => pct(v) };
const CURTO: Record<Formato, (v: number) => string> = { brl: brlCurto, num, pct: (v) => pct(v, 0) };

/** Barras horizontais ordenadas, com valor na ponta. Um único tom (identidade não muda com a ordem). */
export function Barras({ titulo, subtitulo, itens, formato = "brl", cor = 0 }: {
  titulo: string; subtitulo?: string; itens: ItemBarra[]; formato?: Formato; cor?: number;
}) {
  const c = useCores();
  const router = useRouter();
  const dados = [...itens].reverse();
  const option: EChartsOption = {
    grid: { left: 8, right: 72, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: "item", ...tooltipBase(c), formatter: (p: unknown) => {
      const i = dados[(p as { dataIndex: number }).dataIndex];
      return `<b>${i.rotulo}</b><br/>${FMT[formato](i.valor)}${i.detalhe ? `<br/>${i.detalhe}` : ""}`;
    } },
    xAxis: { type: "value", ...eixoBase(c), axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: { type: "category", data: dados.map((i) => i.rotulo), ...eixoBase(c), axisLine: { show: false },
      axisLabel: { color: c.texto, fontSize: 12, width: 180, overflow: "truncate" } },
    series: [{
      type: "bar", data: dados.map((i) => i.valor), barMaxWidth: 16, barCategoryGap: "30%",
      itemStyle: { color: gradBarra(c.series[cor]), borderRadius: [0, 8, 8, 0] },
      showBackground: true, backgroundStyle: { color: comAlfa(c.series[cor], 0.07), borderRadius: [0, 8, 8, 0] },
      emphasis: { itemStyle: { color: c.series[cor], shadowBlur: 12, shadowColor: comAlfa(c.series[cor], 0.45) } },
      label: { show: true, position: "right", color: c.texto, fontSize: 11, fontWeight: "bold", formatter: (p) => CURTO[formato](p.value as number) },
      ...ANIMACAO,
      animationDelay: (i: number) => (dados.length - 1 - i) * 60,
      cursor: dados.some((d) => d.href || d.acao) ? "pointer" : "default",
    }],
  };
  return (
    <Cartao titulo={titulo} subtitulo={subtitulo}
      dados={{ colunas: ["Item", "Valor", "Detalhe"], linhas: itens.map((i) => [i.rotulo, i.valor, i.detalhe ?? ""]) }}
      tabela={<TabelaSimples colunas={["Item", "Valor"]} linhas={itens.map((i) => [i.rotulo, FMT[formato](i.valor)])} />}>
      {itens.length === 0 ? <p className="py-10 text-center text-sm text-muted">Sem registros no período.</p> : (
        <EChart option={option} altura={Math.max(160, itens.length * 28 + 24)}
          onEvents={{ click: (p: { dataIndex: number }) => { const i = dados[p.dataIndex]; if (i?.acao) i.acao(); else if (i?.href) router.push(i.href); } }} />
      )}
    </Cartao>
  );
}
