"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Entrada ao rolar: agora feita por MovimentoGlobal ([data-revelar]); mantido para não mexer em quem já usa. */
export function Aparecer({ children, atraso = 0, className }: { children: React.ReactNode; atraso?: number; className?: string }) {
  return <div className={className} data-revelar style={atraso ? { ["--atraso" as string]: `${Math.round(atraso * 1000)}ms` } : undefined}>{children}</div>;
}

/** Número que conta até o valor final quando aparece na tela. */
export function Contador({ valor, formato, duracao = 1.2 }: { valor: number; formato: (v: number) => string; duracao?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visto = useInView(ref, { once: true });
  const reduzir = useReducedMotion();
  const [atual, setAtual] = useState(reduzir ? valor : 0);
  useEffect(() => {
    if (!visto || reduzir) { setAtual(valor); return; }
    const c = animate(0, valor, { duration: duracao, ease: [0.16, 1, 0.3, 1], onUpdate: setAtual });
    return () => c.stop();
  }, [visto, valor, duracao, reduzir]);
  return <span ref={ref} aria-label={formato(valor)}>{formato(atual)}</span>;
}

/** Cartão com inclinação 3D que segue o ponteiro. */
export function Inclinavel({ children, className, max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
  const reduzir = useReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 200, damping: 20 });
  if (reduzir) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { x.set(0.5); y.set(0.5); }}>
      {children}
    </motion.div>
  );
}
