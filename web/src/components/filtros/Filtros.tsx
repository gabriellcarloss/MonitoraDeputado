"use client";

import { ChevronDown, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
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

const cls = "campo-filtro";

const NOMES: Partial<Record<keyof TFiltros, string>> = {
  uf: "UF", partido: "Partido", inicio: "De", fim: "Até", categoria: "Categoria", cnpj: "CNPJ", deputado: "Deputado", passageiro: "Passageiro",
  busca: "Nome", situacao: "Situação", sexo: "Sexo", alertas: "Alertas", trocou: "Troca de partido", gasto_min: "Gasto mín.", gasto_max: "Gasto máx.",
  ordem: "Ordem", tipo: "Tipo", tema: "Tema", orgao: "Órgão", fornecedor: "Fornecedor", regra: "Regra", severidade: "Severidade",
  favoritos: "Meus deputados", lista: "Lista compartilhada",
};
const VALORES: Record<string, string> = {
  exercicio: "em exercício", fora: "fora do exercício", F: "feminino", M: "masculino", com: "com alertas", sem: "sem alertas", sim: "sim",
  alta: "alta", atencao: "atenção", info: "informativo",
};

function rotuloValor(k: string, v: unknown): string {
  if (Array.isArray(v)) return `${v.length}`;
  if (k === "inicio" || k === "fim") return String(v).split("-").reverse().join("/");
  if (k === "ordem") return String(v).startsWith("-") ? "maior → menor" : "menor → maior";
  return VALORES[String(v)] ?? String(v);
}

export function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-[8.5rem] flex-1 flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted sm:flex-none">
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
      <select className={`${cls}${valor ? " ativo" : ""}`} value={valor ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">{todos}</option>
        {opcoes.map((o) => {
          const [v, r] = Array.isArray(o) ? o : [o, o];
          return <option key={v} value={v}>{r}</option>;
        })}
      </select>
    </Campo>
  );
}

/**
 * Barra de filtros única, acima dos gráficos: fica presa no topo ao rolar (vidro fosco), mostra cada filtro ativo como um
 * chip removível e, no celular, abre e fecha. Extras específicos da página entram como children.
 */
export function BarraFiltros({ opcoes, periodo = true, semUfPartido = false, children }: {
  opcoes: OpcoesFiltro; periodo?: boolean; semUfPartido?: boolean; children?: React.ReactNode;
}) {
  const { filtros, definir, limpar } = useFiltros(opcoes);
  const [aberto, setAberto] = useState(false);
  const chips = (Object.entries(filtros) as [keyof TFiltros, unknown][]).filter(([k, v]) => k !== "so_passagens" && v !== undefined && v !== "");
  return (
    <div className="barra-filtros cartao sticky top-[5.5rem] z-30 mb-6 p-3 lg:top-16" data-revelar>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}
          className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-bold sm:pointer-events-none">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#009c3b] to-[#0b5a3d] text-white shadow-[0_6px_14px_-6px_rgb(0_156_59/0.7)]">
            <SlidersHorizontal size={16} aria-hidden />
          </span>
          Filtros
          {chips.length ? <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-[#ffdf00] px-1.5 text-[11px] text-[#2b2300]">{chips.length}</span> : null}
          <ChevronDown size={16} aria-hidden className={`transition-transform sm:hidden ${aberto ? "rotate-180" : ""}`} />
        </button>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {chips.map(([k, v]) => (
            <span key={k} className="chip">
              {NOMES[k] ?? k}: {rotuloValor(k, v)}
              <button type="button" aria-label={`Tirar filtro ${NOMES[k] ?? k}`} onClick={() => definir({ [k]: undefined } as Partial<TFiltros>)}>
                <X size={12} aria-hidden />
              </button>
            </span>
          ))}
        </div>
        {chips.length ? (
          <button type="button" onClick={limpar} className="pilula h-8 px-3 text-xs">
            <RotateCcw size={13} aria-hidden /> Limpar tudo
          </button>
        ) : null}
      </div>
      <div className={`${aberto ? "flex" : "hidden"} mt-3 flex-wrap items-end gap-3 border-t border-border pt-3 sm:flex`}>
        {periodo ? (
          <>
            <Campo rotulo="De"><input type="month" className={`${cls}${filtros.inicio ? " ativo" : ""}`} value={filtros.inicio ?? ""} min="2023-01"
              onChange={(e) => definir({ inicio: e.target.value || undefined })} /></Campo>
            <Campo rotulo="Até"><input type="month" className={`${cls}${filtros.fim ? " ativo" : ""}`} value={filtros.fim ?? ""} min="2023-01"
              onChange={(e) => definir({ fim: e.target.value || undefined })} /></Campo>
          </>
        ) : null}
        {semUfPartido ? null : (
          <>
            <Selecao rotulo="UF" valor={filtros.uf} opcoes={opcoes.ufs} onChange={(uf) => definir({ uf })} />
            <Selecao rotulo="Partido" valor={filtros.partido} opcoes={opcoes.partidos} onChange={(partido) => definir({ partido })} />
          </>
        )}
        {children}
      </div>
    </div>
  );
}
