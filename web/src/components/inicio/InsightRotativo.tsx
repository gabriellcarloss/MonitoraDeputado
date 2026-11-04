"use client";

import { ChevronLeft, ChevronRight, Lightbulb, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Destaque } from "@/lib/destaques";

const DURACAO = 7000;

/** Um destaque por vez, trocando sozinho (pausa ao passar o mouse ou ao clicar em pausar). */
export function InsightRotativo({ itens }: { itens: Destaque[] }) {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [sobre, setSobre] = useState(false);
  const [reduzir, setReduzir] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduzir(m.matches);
    const f = () => setReduzir(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  const parado = pausado || sobre || reduzir || itens.length < 2;
  useEffect(() => {
    if (parado) return;
    const t = setTimeout(() => setI((v) => (v + 1) % itens.length), DURACAO);
    return () => clearTimeout(t);
  }, [i, parado, itens.length]);
  if (!itens.length) return null;
  const d = itens[i % itens.length];
  const ir = (n: number) => setI((v) => (v + n + itens.length) % itens.length);
  return (
    <section aria-label="Você sabia?" onMouseEnter={() => setSobre(true)} onMouseLeave={() => setSobre(false)}
      className="cartao relative overflow-hidden border-transparent p-5 text-white" data-revelar
      style={{ background: "linear-gradient(135deg,#0b5a3d 0%,#0e6b49 55%,#002776 100%)" }}>
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#ffdf00]/20 blur-2xl" />
      <div className="relative flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ffdf00] text-[#002776] shadow-[0_0_24px_rgb(255_223_0/0.5)]">
          <Lightbulb size={22} aria-hidden />
        </span>
        <div key={i} className="min-w-0 flex-1" style={{ animation: reduzir ? undefined : "insight-entra .5s cubic-bezier(.2,.8,.2,1)" }} aria-live={parado ? "polite" : "off"}>
          <p className="text-xs font-bold uppercase tracking-wider text-[#ffdf00]">Você sabia? · {d.titulo}</p>
          <p className="mt-1 text-base font-semibold leading-snug md:text-lg">{d.texto}</p>
          {d.href ? <Link href={d.href} className="mt-2 inline-block text-sm font-bold text-[#ffdf00] underline-offset-2 hover:underline">Ver detalhes →</Link> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => ir(-1)} aria-label="Anterior" className="rounded-lg p-1.5 hover:bg-white/15"><ChevronLeft size={18} /></button>
          {!reduzir ? (
            <button type="button" onClick={() => setPausado((v) => !v)} aria-label={pausado ? "Retomar" : "Pausar"} className="rounded-lg p-1.5 hover:bg-white/15">
              {pausado ? <Play size={16} /> : <Pause size={16} />}
            </button>
          ) : null}
          <button type="button" onClick={() => ir(1)} aria-label="Próximo" className="rounded-lg p-1.5 hover:bg-white/15"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="relative mt-4 flex items-center gap-1.5" aria-hidden>
        {itens.map((_, k) => (
          <button key={k} type="button" tabIndex={-1} onClick={() => setI(k)} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
            {k < i ? <span className="absolute inset-0 bg-white/80" /> : null}
            {k === i ? <span key={`${i}-${parado}`} className="absolute inset-0 origin-left bg-[#ffdf00]"
              style={parado ? { transform: "scaleX(1)" } : { animation: `insight-tempo ${DURACAO}ms linear forwards` }} /> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
