"use client";

import clsx from "clsx";
import { Cartao, TabelaSimples } from "./Cartao";
import { useCores } from "./cores";

/** Mapa em grade (tile map): cada UF ocupa uma célula na posição aproximada do território. */
const GRADE: Record<string, [number, number]> = {
  RR: [0, 2], AP: [0, 4],
  AM: [1, 1], PA: [1, 3], MA: [1, 4], CE: [1, 5], RN: [1, 6],
  AC: [2, 0], RO: [2, 1], TO: [2, 3], PI: [2, 4], PB: [2, 6], PE: [2, 5],
  MT: [3, 2], GO: [3, 3], BA: [3, 4], AL: [3, 6], SE: [3, 5],
  MS: [4, 2], DF: [4, 3], MG: [4, 4], ES: [4, 5],
  SP: [5, 3], RJ: [5, 4], PR: [6, 3], SC: [7, 3], RS: [8, 2],
};

function textoSobre(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.25 ? "#111827" : "#ffffff";
}

export function MapaBrasil({ titulo, subtitulo, valores, formato, onSelecionar, selecionada }: {
  titulo: string; subtitulo?: string; valores: Record<string, number | null>; formato: (v: number) => string;
  onSelecionar?: (uf: string) => void; selecionada?: string;
}) {
  const c = useCores();
  const nums = Object.values(valores).filter((v): v is number => v !== null && Number.isFinite(v));
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const passo = (v: number) => (max === min ? 3 : Math.min(5, Math.floor(((v - min) / (max - min)) * 6)));
  return (
    <Cartao titulo={titulo} subtitulo={subtitulo}
      tabela={<TabelaSimples colunas={["UF", "Valor"]}
        linhas={Object.entries(valores).sort((a, b) => (b[1] ?? -1) - (a[1] ?? -1)).map(([uf, v]) => [uf, v === null ? "—" : formato(v)])} />}>
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {Object.entries(GRADE).map(([uf, [lin, col]]) => {
          const v = valores[uf];
          const s = v === null || v === undefined ? -1 : passo(v);
          return (
            <button key={uf} type="button" onClick={() => onSelecionar?.(uf)}
              style={{ gridRow: lin + 1, gridColumn: col + 1, background: s < 0 ? undefined : c.seq[s] }}
              className={clsx("flex aspect-square flex-col items-center justify-center rounded-md border text-[11px] leading-tight",
                s < 0 && "bg-subtle", selecionada === uf ? "border-fg ring-2 ring-fg" : "border-transparent")}
              title={`${uf}: ${v === null || v === undefined ? "sem dados" : formato(v)}`}
              aria-label={`${uf}: ${v === null || v === undefined ? "sem dados" : formato(v)}`}>
              <span className="font-semibold" style={{ color: s < 0 ? undefined : textoSobre(c.seq[s]) }}>{uf}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span>{nums.length ? formato(min) : ""}</span>
        <div className="flex h-2 flex-1 overflow-hidden rounded">
          {c.seq.map((cor) => <div key={cor} className="flex-1" style={{ background: cor }} />)}
        </div>
        <span>{nums.length ? formato(max) : ""}</span>
      </div>
    </Cartao>
  );
}
