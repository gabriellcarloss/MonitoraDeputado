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
    backgroundColor: c.superficie, borderColor: c.grade, textStyle: { color: c.texto, fontSize: 12 },
    extraCssText: "box-shadow:0 4px 16px rgba(0,0,0,.12);border-radius:8px;",
  };
}
