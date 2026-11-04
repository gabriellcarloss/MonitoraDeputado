"use client";

import { useEffect, useRef } from "react";

/** Fio tricolor no topo que acompanha o quanto da página já foi lida. */
export function ProgressoRolagem() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let quadro = 0;
    const atualizar = () => {
      quadro = 0;
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, el.scrollTop / total)) : 0;
      if (ref.current) ref.current.style.transform = `scaleX(${p})`;
    };
    const aoRolar = () => { if (!quadro) quadro = requestAnimationFrame(atualizar); };
    atualizar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => { window.removeEventListener("scroll", aoRolar); window.removeEventListener("resize", aoRolar); if (quadro) cancelAnimationFrame(quadro); };
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]">
      <div ref={ref} className="faixa-bandeira-h h-full origin-left" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
