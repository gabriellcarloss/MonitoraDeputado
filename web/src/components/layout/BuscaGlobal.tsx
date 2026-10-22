"use client";

import { Building2, MapPin, Plane, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { buscar, type Resultado } from "@/lib/busca";
import type { DeputadoResumo } from "@/lib/types";
import { useJson } from "@/lib/useJson";

const ICONES: Record<Resultado["tipo"], typeof Search> = {
  deputado: Users, uf: MapPin, partido: Users, fornecedor: Building2, "fornecedor-nome": Building2, passageiro: Plane,
};

/** Busca global: deputado, partido, UF, fornecedor (nome ou CNPJ) e passageiro. */
export function BuscaGlobal({ onNavegar }: { onNavegar?: () => void }) {
  const [termo, setTermo] = useState("");
  const [ativo, setAtivo] = useState(0);
  const [aberto, setAberto] = useState(false);
  const { dados } = useJson<DeputadoResumo[]>(aberto ? "/data/deputados.json" : null);
  const router = useRouter();
  const id = useId();
  const resultados = useMemo(() => buscar(termo, dados ?? []), [termo, dados]);
  const ir = (r?: Resultado) => {
    if (!r) return;
    router.push(r.href);
    setTermo("");
    setAberto(false);
    onNavegar?.();
  };
  return (
    <div className="relative px-3 pb-3">
      <label htmlFor={id} className="sr-only">Buscar deputado, partido, UF, fornecedor ou passageiro</label>
      <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 ring-1 ring-white/15 focus-within:ring-[#ffdf00]">
        <Search size={16} className="text-white/70" aria-hidden />
        <input id={id} type="search" value={termo} placeholder="Buscar deputado, CNPJ…" autoComplete="off"
          role="combobox" aria-expanded={aberto && resultados.length > 0} aria-controls={`${id}-lista`}
          className="h-9 w-full bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
          onFocus={() => setAberto(true)} onBlur={() => setTimeout(() => setAberto(false), 150)}
          onChange={(e) => { setTermo(e.target.value); setAtivo(0); setAberto(true); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((a) => Math.min(a + 1, resultados.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter") { e.preventDefault(); ir(resultados[ativo]); }
            if (e.key === "Escape") setAberto(false);
          }} />
      </div>
      {aberto && resultados.length ? (
        <ul id={`${id}-lista`} role="listbox" className="absolute left-3 right-3 z-50 mt-1 overflow-hidden rounded-lg border border-border bg-card text-fg shadow-xl">
          {resultados.map((r, i) => {
            const Icone = ICONES[r.tipo];
            return (
              <li key={r.href} role="option" aria-selected={i === ativo}>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); ir(r); }} onMouseEnter={() => setAtivo(i)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${i === ativo ? "bg-subtle" : ""}`}>
                  <Icone size={14} className="shrink-0 text-destaque" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{r.rotulo}</span>
                  {r.detalhe ? <span className="shrink-0 text-xs text-muted">{r.detalhe}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
