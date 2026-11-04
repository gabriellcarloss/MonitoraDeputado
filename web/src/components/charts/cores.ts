"use client";

import { useEffect, useState } from "react";

export interface Cores {
  series: string[];
  seq: string[];
  texto: string;
  muted: string;
  grade: string;
  eixo: string;
  superficie: string;
  alta: string;
  atencao: string;
  info: string;
}

const PADRAO: Cores = {
  series: ["#009c3b", "#2a78d6", "#eda100", "#6250d6", "#e34948"],
  seq: ["#e3f4e8", "#b5e2c2", "#7fcb98", "#40ad69", "#008a35", "#005c23"],
  texto: "#111827", muted: "#525a66", grade: "#e5e7eb", eixo: "#6b7280", superficie: "#ffffff",
  alta: "#d03b3b", atencao: "#fab219", info: "#2a78d6",
};

function ler(): Cores {
  if (typeof window === "undefined") return PADRAO;
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  const rgb = (n: string) => `rgb(${v(n).split(" ").join(",")})`;
  return {
    series: [1, 2, 3, 4, 5].map((i) => v(`--serie-${i}`) || PADRAO.series[i - 1]),
    seq: [0, 1, 2, 3, 4, 5].map((i) => v(`--seq-${i}`) || PADRAO.seq[i]),
    texto: rgb("--fg"), muted: rgb("--muted"), grade: v("--grade"), eixo: v("--eixo"), superficie: rgb("--card"),
    alta: rgb("--alta"), atencao: rgb("--atencao"), info: rgb("--info"),
  };
}

/** Cores dos gráficos lidas dos tokens CSS; atualiza quando o tema muda. */
export function useCores(): Cores {
  const [c, setC] = useState<Cores>(PADRAO);
  useEffect(() => {
    const at = () => setC(ler());
    at();
    window.addEventListener("tema", at);
    const mo = new MutationObserver(at);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      window.removeEventListener("tema", at);
      mo.disconnect();
    };
  }, []);
  return c;
}

export function eixoBase(c: Cores) {
  return {
    axisLine: { lineStyle: { color: c.grade } },
    axisTick: { show: false },
    axisLabel: { color: c.muted, fontSize: 11 },
    splitLine: { lineStyle: { color: c.grade, type: "solid" as const } },
  };
}

export function tooltipBase(c: Cores) {
  return {
    backgroundColor: comAlfa(c.superficie, 0.86), borderColor: comAlfa(c.series[0], 0.35), borderWidth: 1, padding: [8, 12],
    textStyle: { color: c.texto, fontSize: 12 },
    extraCssText: "box-shadow:0 14px 40px -12px rgba(0,0,0,.35);border-radius:12px;backdrop-filter:blur(10px) saturate(1.4);-webkit-backdrop-filter:blur(10px) saturate(1.4);",
  };
}

/** Cor com transparência (aceita #rrggbb e rgb(r,g,b)). */
export function comAlfa(cor: string, a: number): string {
  const hex = cor.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const rgb = cor.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(/[ ,/]+/).filter(Boolean);
    return `rgba(${r},${g},${b},${a})`;
  }
  return cor;
}

/** Gradiente vertical (áreas e colunas): cor cheia no topo, sumindo embaixo. */
export function gradV(cor: string, topo = 0.45, base = 0.02) {
  return { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [{ offset: 0, color: comAlfa(cor, topo) }, { offset: 1, color: comAlfa(cor, base) }] };
}

/** Gradiente de barra (da cor mais escura para a mais clara), horizontal ou vertical. */
export function gradBarra(cor: string, horizontal = true) {
  return { type: "linear" as const, x: 0, y: horizontal ? 0 : 1, x2: horizontal ? 1 : 0, y2: 0,
    colorStops: [{ offset: 0, color: comAlfa(cor, 0.75) }, { offset: 1, color: comAlfa(cor, 1) }] };
}

/** Entrada animada padrão (em cascata pelo índice do ponto). */
export const ANIMACAO = {
  animationDuration: 1100,
  animationEasing: "cubicOut" as const,
  animationDelay: (i: number) => Math.min(i * 18, 700),
  animationDurationUpdate: 500,
};
