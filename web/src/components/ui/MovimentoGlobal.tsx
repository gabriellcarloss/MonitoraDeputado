"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Script do <head>: liga o modo com movimento (.mov) antes da primeira pintura, para os cartões já nascerem prontos
 * para entrar animados. Se o JavaScript do site não carregar em 4 s, desliga sozinho e mostra tudo.
 */
export const scriptMovimento = `(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.classList.add('mov');setTimeout(function(){if(!window.__movOk)d.classList.remove('mov')},4000)}catch(_){}})()`;

const MAX_GRAUS = 7;

/**
 * Movimento do site inteiro, num só lugar:
 * - [data-revelar] entra ao aparecer na tela (em cascata quando vários aparecem juntos);
 * - .cartao recebe a luz que segue o ponteiro (--mx/--my);
 * - [data-tilt] inclina em 3D na direção do ponteiro (--rx/--ry).
 * Nada disso roda com movimento reduzido ou em telas de toque (só a entrada ao rolar).
 */
export function MovimentoGlobal() {
  const caminho = usePathname();

  useEffect(() => {
    (window as unknown as { __movOk?: boolean }).__movOk = true;
    const raiz = document.documentElement;
    if (!raiz.classList.contains("mov")) return;

    const io = new IntersectionObserver((entradas) => {
      let ordem = 0;
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.style.setProperty("--atraso", `${Math.min(ordem++, 8) * 70}ms`);
        el.classList.add("revelado");
        io.unobserve(el);
      }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });

    const observar = (no: ParentNode) => no.querySelectorAll<HTMLElement>("[data-revelar]:not(.revelado)").forEach((el) => io.observe(el));
    observar(document);
    const mo = new MutationObserver((ms) => {
      for (const m of ms) m.addedNodes.forEach((n) => {
        if (!(n instanceof HTMLElement)) return;
        if (n.matches("[data-revelar]:not(.revelado)")) io.observe(n);
        observar(n);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // segurança: o que já estiver na tela e por algum motivo não for observado aparece em 2,5 s
    const t = setTimeout(() => document.querySelectorAll<HTMLElement>("[data-revelar]:not(.revelado)").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add("revelado");
    }), 2500);
    return () => { io.disconnect(); mo.disconnect(); clearTimeout(t); };
  }, [caminho]);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let inclinado: HTMLElement | null = null;
    let quadro = 0;
    let ultimo: PointerEvent | null = null;

    const soltar = () => {
      if (!inclinado) return;
      inclinado.style.setProperty("--rx", "0deg");
      inclinado.style.setProperty("--ry", "0deg");
      inclinado = null;
    };
    const aplicar = () => {
      quadro = 0;
      const e = ultimo;
      if (!e) return;
      const alvo = e.target instanceof Element ? e.target : null;
      const cartao = alvo?.closest<HTMLElement>(".cartao");
      if (cartao) {
        const r = cartao.getBoundingClientRect();
        cartao.style.setProperty("--mx", `${e.clientX - r.left}px`);
        cartao.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      const tilt = alvo?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (tilt !== inclinado) soltar();
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        const max = Number(tilt.dataset.tilt) || MAX_GRAUS;
        tilt.style.setProperty("--rx", `${(-y * max).toFixed(2)}deg`);
        tilt.style.setProperty("--ry", `${(x * max).toFixed(2)}deg`);
        inclinado = tilt;
      }
    };
    const mover = (e: PointerEvent) => {
      ultimo = e;
      if (!quadro) quadro = requestAnimationFrame(aplicar);
    };
    document.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("pointerleave", soltar);
    return () => {
      document.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerleave", soltar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, []);

  return null;
}

/** Título com letras que surgem girando em 3D (Borges); trechos em `ouro` ganham a onda de brilho amarelo. */
export function TituloAnimado({ partes, className }: { partes: { texto: string; ouro?: boolean }[]; className?: string }) {
  let l = 0;
  const textoCompleto = partes.map((p) => p.texto).join("");
  return (
    <h1 className={className} aria-label={textoCompleto} style={{ perspective: "700px" }}>
      {partes.map((p, i) => (
        <span key={i} aria-hidden className={p.ouro ? "text-[#ffdf00]" : undefined}>
          {p.texto.split(/(\s+)/).map((palavra, j) => /^\s+$/.test(palavra) ? <span key={j}>{palavra}</span> : (
            <span key={j} className="inline-block whitespace-nowrap">
              {Array.from(palavra).map((ch, k) => (
                <span key={k} className={p.ouro ? "letra-ouro" : "letra-3d"} style={{ ["--l" as string]: l++ }}>{ch}</span>
              ))}
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}
