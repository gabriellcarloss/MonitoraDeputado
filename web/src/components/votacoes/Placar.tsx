/** Barra de placar Sim / Não / Outros com rótulos em texto (cor nunca sozinha). */
export function Placar({ sim, nao, outros, compacto = false }: { sim: number; nao: number; outros: number; compacto?: boolean }) {
  const t = sim + nao + outros || 1;
  return (
    <div className="min-w-[140px]">
      <div className="flex h-2 overflow-hidden rounded-full bg-subtle" aria-hidden>
        <span className="h-full bg-verde" style={{ width: `${(sim / t) * 100}%` }} />
        <span className="h-full bg-alta" style={{ width: `${(nao / t) * 100}%` }} />
        <span className="h-full bg-muted/50" style={{ width: `${(outros / t) * 100}%` }} />
      </div>
      <p className={`num mt-1 ${compacto ? "text-[11px]" : "text-xs"} text-muted`}>
        <span className="font-semibold text-fg">{sim}</span> sim · <span className="font-semibold text-fg">{nao}</span> não · {outros} outros
      </p>
    </div>
  );
}
