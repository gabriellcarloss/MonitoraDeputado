"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Cartao, TabelaSimples } from "./Cartao";
import { useCores } from "./cores";
import { GRADE } from "./MapaBrasil";

const S = 46; // lado da coluna (px)
const P = 52; // passo da grade
const HMAX = 130;

function sombra(hex: string, f: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f));
  return `rgb(${c.join(",")})`;
}

/**
 * Mapa 3D em grade: cada UF é uma coluna cuja altura e tom são proporcionais ao valor.
 * Arraste para girar; clique numa UF para filtrar. A tabela (Ver tabela) traz os mesmos números.
 */
export function Mapa3D({ titulo, subtitulo, valores, formato, onSelecionar, acoes }: {
  titulo: string; subtitulo?: string; valores: Record<string, number | null>; formato: (v: number) => string;
  onSelecionar?: (uf: string) => void; acoes?: React.ReactNode;
}) {
  const c = useCores();
  const reduzir = useReducedMotion();
  const [rot, setRot] = useState({ x: 58, z: -28 });
  const [crescido, setCrescido] = useState(!!reduzir);
  const [foco, setFoco] = useState<string | null>(null);
  const arrasto = useRef<{ x: number; y: number; rx: number; rz: number } | null>(null);
  useEffect(() => { const t = setTimeout(() => setCrescido(true), 120); return () => clearTimeout(t); }, []);

  const nums = Object.values(valores).filter((v): v is number => v !== null && Number.isFinite(v));
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const norm = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));

  return (
    <Cartao titulo={titulo} subtitulo={subtitulo}
      tabela={<TabelaSimples colunas={["UF", "Valor"]}
        linhas={Object.entries(valores).sort((a, b) => (b[1] ?? -1) - (a[1] ?? -1)).map(([uf, v]) => [uf, v === null ? "—" : formato(v)])} />}>
      <div className="relative h-[440px] touch-none select-none overflow-hidden rounded-xl bg-gradient-to-b from-subtle/40 to-transparent"
        style={{ perspective: 1100 }}
        onPointerDown={(e) => { arrasto.current = { x: e.clientX, y: e.clientY, rx: rot.x, rz: rot.z }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (!a) return;
          setRot({ x: Math.max(20, Math.min(72, a.rx - (e.clientY - a.y) * 0.25)), z: a.rz + (e.clientX - a.x) * 0.35 });
        }}
        onPointerUp={() => { arrasto.current = null; }}>
        <div className="absolute left-1/2 top-[52%]" style={{
          width: 7 * P, height: 9 * P, marginLeft: -(7 * P) / 2, marginTop: -(9 * P) / 2,
          transformStyle: "preserve-3d", transform: `rotateX(${rot.x}deg) rotateZ(${rot.z}deg)`,
          transition: arrasto.current ? "none" : "transform .6s cubic-bezier(.22,1,.36,1)",
        }}>
          {Object.entries(GRADE).map(([uf, [lin, col]]) => {
            const v = valores[uf];
            const tem = v !== null && v !== undefined;
            const t = tem ? norm(v) : 0;
            const h = crescido ? (tem ? 6 + t * HMAX : 2) : 2;
            const cor = tem ? c.seq[Math.min(5, Math.floor(t * 5.999))] : c.grade;
            const face = { position: "absolute" as const, transition: "all .9s cubic-bezier(.22,1,.36,1)" };
            const ativo = foco === uf;
            return (
              <button key={uf} type="button" aria-label={`${uf}: ${tem ? formato(v) : "sem dados"}`}
                onClick={() => onSelecionar?.(uf)} onPointerEnter={() => setFoco(uf)} onPointerLeave={() => setFoco(null)}
                onFocus={() => setFoco(uf)} onBlur={() => setFoco(null)}
                style={{ position: "absolute", left: col * P, top: lin * P, width: S, height: S, transformStyle: "preserve-3d", transitionDelay: `${(lin + col) * 30}ms` }}>
                <span style={{ ...face, left: 0, top: 0, width: S, height: S, transform: `translateZ(${h}px)`, background: ativo ? c.series[2] : cor,
                  display: "grid", placeItems: "center", borderRadius: 3, boxShadow: ativo ? `0 0 24px ${c.series[2]}` : undefined }}>
                  <span className="font-display text-[13px]" style={{ color: t > 0.45 || ativo ? "#0b1220" : "#fff", textShadow: t > 0.45 || ativo ? "none" : "0 1px 2px rgba(0,0,0,.6)" }}>{uf}</span>
                </span>
                <span style={{ ...face, left: 0, top: S - h, width: S, height: h, transformOrigin: "bottom", transform: "rotateX(-90deg)", background: sombra(cor, 0.72) }} />
                <span style={{ ...face, left: 0, top: 0, width: S, height: h, transformOrigin: "top", transform: "rotateX(90deg)", background: sombra(cor, 0.82) }} />
                <span style={{ ...face, left: S - h, top: 0, width: h, height: S, transformOrigin: "right", transform: "rotateY(90deg)", background: sombra(cor, 0.6) }} />
                <span style={{ ...face, left: 0, top: 0, width: h, height: S, transformOrigin: "left", transform: "rotateY(-90deg)", background: sombra(cor, 0.9) }} />
              </button>
            );
          })}
        </div>
        {acoes ? <div className="absolute right-3 top-14 z-10 sm:top-3" onPointerDown={(e) => e.stopPropagation()}>{acoes}</div> : null}
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-border bg-card/90 px-3 py-2 text-sm shadow-lg backdrop-blur" aria-live="polite">
          {foco ? <><span className="font-display text-lg">{foco}</span> <span className="num-display ml-2 text-lg">{valores[foco] == null ? "sem dados" : formato(valores[foco]!)}</span></>
            : <span className="text-muted">Arraste para girar · clique numa UF</span>}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-xs text-muted">
          <span>{nums.length ? formato(min) : ""}</span>
          <div className="flex h-2 flex-1 overflow-hidden rounded">{c.seq.map((cor) => <div key={cor} className="flex-1" style={{ background: cor }} />)}</div>
          <span>{nums.length ? formato(max) : ""}</span>
        </div>
      </div>
    </Cartao>
  );
}
