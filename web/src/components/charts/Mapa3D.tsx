"use client";

import type { EChartsOption } from "echarts";
import { Box, Map as MapaIcone } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { faixas } from "@/lib/mapa";
import { carregarJson } from "@/lib/useJson";
import { Cartao, TabelaSimples } from "./Cartao";
import { tooltipBase, useCores } from "./cores";

const NOMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
  ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

let registro: Promise<typeof import("echarts/core")> | null = null;

/** Carrega ECharts + echarts-gl e registra o contorno dos estados uma única vez. */
function preparar() {
  registro ??= (async () => {
    const echarts = await import("echarts/core");
    const [{ MapChart }, comp, { CanvasRenderer }] = await Promise.all([
      import("echarts/charts"), import("echarts/components"), import("echarts/renderers"),
    ]);
    echarts.use([MapChart, comp.TooltipComponent, comp.VisualMapComponent, comp.GeoComponent, CanvasRenderer]);
    await import("echarts-gl");
    echarts.registerMap("brasil-uf", await carregarJson("/geo/br-uf.json"));
    return echarts;
  })();
  return registro;
}

/**
 * Mapa do Brasil por UF. Em 3D cada estado é extrudado (altura pela posição relativa) e colorido por faixa de quantil,
 * para um estado com valor extremo não achatar os demais. "Plano" mostra o mapa coroplético 2D.
 */
export function Mapa3D({ titulo, subtitulo, valores, formato, formatoCurto, onSelecionar, acoes }: {
  titulo: string; subtitulo?: string; valores: Record<string, number | null>; formato: (v: number) => string;
  formatoCurto?: (v: number) => string; onSelecionar?: (uf: string) => void; acoes?: React.ReactNode;
}) {
  const curto = formatoCurto ?? formato;
  const c = useCores();
  const reduzir = useReducedMotion();
  const router = useRouter();
  const [modo, setModo] = useState<"3d" | "plano">("3d");
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => { if (window.innerWidth < 640 || reduzir) setModo("plano"); }, [reduzir]);

  const f = faixas(valores, 5);
  const cores = c.seq.slice(1, 6);
  const ordenados = Object.values(valores).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const posicao = (v: number) => (ordenados.length > 1 ? ordenados.findIndex((x) => x >= v) / (ordenados.length - 1) : 0.5);

  useEffect(() => {
    if (!el) return;
    let instancia: { dispose(): void; resize(): void } | null = null;
    let vivo = true;
    const aoRedimensionar = () => instancia?.resize();
    preparar().then((echarts) => {
      if (!vivo) return;
      const ch = echarts.init(el);
      instancia = ch;
      const dados = Object.entries(NOMES).map(([uf, nome]) => {
        const v = valores[uf];
        const tem = v !== null && v !== undefined;
        return {
          name: uf, value: tem ? v : null, nome,
          height: tem ? 1.5 + 9 * posicao(v) : 0.6,
          itemStyle: { color: tem ? cores[f.classe(v)] : c.grade },
        };
      });
      const tooltip = {
        ...tooltipBase(c),
        formatter: (p: unknown) => {
          const d = (p as { data?: { name: string; nome: string; value: number | null } }).data;
          if (!d) return "";
          return `<b>${d.nome} (${d.name})</b><br/>${d.value === null ? "sem dados" : formato(d.value)}`;
        },
      };
      const rotulo = { show: true, formatter: (p: { name: string }) => p.name, fontSize: 11, fontWeight: 600 as const };
      const opcao = (modo === "3d" ? {
        tooltip,
        series: [{
          type: "map3D", map: "brasil-uf", data: dados, boxWidth: 100, boxDepth: 104, regionHeight: 1.5,
          shading: "lambert",
          light: { main: { intensity: 1.15, shadow: true, shadowQuality: "high", alpha: 40, beta: 30 }, ambient: { intensity: 0.45 } },
          viewControl: { distance: 104, alpha: 48, beta: 8, minAlpha: 15, maxAlpha: 85, autoRotate: false, damping: 0.85,
            animationDurationUpdate: 900 },
          groundPlane: { show: false },
          itemStyle: { borderWidth: 0.6, borderColor: c.superficie },
          emphasis: { itemStyle: { color: c.series[2] }, label: { show: true, textStyle: { color: "#0b1220", fontSize: 13, backgroundColor: "transparent" } } },
          label: { ...rotulo, distance: 1, textStyle: { color: c.texto, fontSize: 11, fontWeight: 600, backgroundColor: c.superficie,
            padding: [2, 4], borderRadius: 3, opacity: 0.92 } },
          animation: !reduzir, animationDurationUpdate: 800,
        }],
      } : {
        tooltip,
        series: [{
          type: "map", map: "brasil-uf", aspectScale: 1, roam: false, layoutCenter: ["50%", "46%"], layoutSize: "92%",
          data: dados.map(({ height: _h, itemStyle, ...d }) => ({ ...d, itemStyle: { areaColor: itemStyle.color } })),
          itemStyle: { borderColor: c.superficie, borderWidth: 1 },
          emphasis: { itemStyle: { areaColor: c.series[2] }, label: { color: "#0b1220" } },
          select: { disabled: true },
          label: { ...rotulo, color: c.texto, fontSize: 10, textBorderColor: c.superficie, textBorderWidth: 2 },
        }],
      }) as unknown as EChartsOption;
      ch.setOption(opcao);
      ch.on("click", (p: { name?: string }) => {
        if (!p.name) return;
        if (onSelecionar) onSelecionar(p.name); else router.push(`/deputados/?uf=${p.name}`);
      });
      window.addEventListener("resize", aoRedimensionar);
    });
    return () => { vivo = false; window.removeEventListener("resize", aoRedimensionar); instancia?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el, modo, JSON.stringify(valores), c, reduzir]);

  return (
    <Cartao titulo={titulo} subtitulo={subtitulo}
      tabela={<TabelaSimples colunas={["UF", "Valor"]}
        linhas={Object.entries(valores).sort((a, b) => (b[1] ?? -1) - (a[1] ?? -1)).map(([uf, v]) => [`${NOMES[uf] ?? uf} (${uf})`, v === null ? "—" : formato(v)])} />}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {acoes}
        <div className="ml-auto flex gap-1" role="group" aria-label="Modo do mapa">
          <button type="button" className="pilula h-7 px-2.5 text-xs" aria-pressed={modo === "3d"} onClick={() => setModo("3d")}><Box size={12} aria-hidden /> 3D</button>
          <button type="button" className="pilula h-7 px-2.5 text-xs" aria-pressed={modo === "plano"} onClick={() => setModo("plano")}><MapaIcone size={12} aria-hidden /> Plano</button>
        </div>
      </div>
      <div ref={setEl} className="h-[500px] w-full touch-none rounded-xl bg-gradient-to-b from-subtle/50 to-transparent" role="img"
        aria-label={`${titulo}. Use "Ver tabela" para os valores.`} />
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted" aria-hidden>
        {cores.map((cor, i) => (
          <span key={cor} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-3.5 rounded-sm" style={{ background: cor }} />
            {f.limites.length ? `${curto(f.limites[i])} – ${curto(f.limites[i + 1])}` : ""}
          </span>
        ))}
        <span className="ml-auto">{modo === "3d" ? "Arraste para girar · role para aproximar · " : ""}clique numa UF</span>
      </div>
      <p className="mt-1 text-[10px] text-muted">Contornos: @svg-maps/brazil (CC BY 4.0). Cores por faixas de quantil — cada faixa reúne cerca de 1/5 das UFs.</p>
    </Cartao>
  );
}
