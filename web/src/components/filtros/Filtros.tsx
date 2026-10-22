"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { type Filtros as TFiltros, paraQuery, parseFiltros } from "@/lib/filters";

export interface OpcoesFiltro {
  ufs: string[];
  partidos: string[];
}

/** Lê os filtros da URL (descartando valores inválidos). */
export function useFiltros(opcoes: OpcoesFiltro) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const filtros = useMemo(() => parseFiltros(new URLSearchParams(sp?.toString() ?? ""), opcoes), [sp, opcoes]);
  const definir = (mudanca: Partial<TFiltros>) =>
    router.replace(`${path}${paraQuery({ ...filtros, ...mudanca })}`, { scroll: false });
  const limpar = () => router.replace(path, { scroll: false });
  return { filtros, definir, limpar };
}

const cls = "h-9 rounded-full border border-border bg-subtle/60 px-3 text-sm font-medium focus:border-verde focus:outline-none";

export function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-muted">
      {rotulo}
      {children}
    </label>
  );
}

export function Selecao({ rotulo, valor, opcoes, onChange, todos = "Todos" }: {
  rotulo: string; valor?: string; opcoes: (string | [string, string])[]; onChange: (v?: string) => void; todos?: string;
}) {
  return (
    <Campo rotulo={rotulo}>
      <select className={cls} value={valor ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">{todos}</option>
        {opcoes.map((o) => {
          const [v, r] = Array.isArray(o) ? o : [o, o];
          return <option key={v} value={v}>{r}</option>;
        })}
      </select>
    </Campo>
  );
}

/** Barra de filtros única, acima dos gráficos. Extras específicos da página entram como children. */
export function BarraFiltros({ opcoes, periodo = true, semUfPartido = false, children }: {
  opcoes: OpcoesFiltro; periodo?: boolean; semUfPartido?: boolean; children?: React.ReactNode;
}) {
  const { filtros, definir, limpar } = useFiltros(opcoes);
  const ativos = Object.keys(filtros).length;
  return (
    <div className="cartao mb-6 flex flex-wrap items-end gap-3 p-3">
      {periodo ? (
        <>
          <Campo rotulo="De"><input type="month" className={cls} value={filtros.inicio ?? ""} min="2023-01"
            onChange={(e) => definir({ inicio: e.target.value || undefined })} /></Campo>
          <Campo rotulo="Até"><input type="month" className={cls} value={filtros.fim ?? ""} min="2023-01"
            onChange={(e) => definir({ fim: e.target.value || undefined })} /></Campo>
        </>
      ) : null}
      <Selecao rotulo="UF" valor={filtros.uf} opcoes={opcoes.ufs} onChange={(uf) => definir({ uf })}/>
      <Selecao rotulo="Partido" valor={filtros.partido} opcoes={opcoes.partidos} onChange={(partido) => definir({ partido })} />
      {children}
      {ativos ? (
        <button type="button" onClick={limpar} className="pilula">
          <X size={14} aria-hidden /> Limpar filtros
        </button>
      ) : null}
    </div>
  );
}
