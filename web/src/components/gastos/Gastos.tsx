"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { Barras } from "@/components/charts/Barras";
import { SerieTemporal } from "@/components/charts/SerieTemporal";
import { BarraFiltros, Selecao, useFiltros } from "@/components/filtros/Filtros";
import { Carregando, Erro, StatTile } from "@/components/ui/StatTile";
import { useConsulta } from "@/lib/duck";
import { paraQuery } from "@/lib/filters";
import { brl, brlCurto, num } from "@/lib/format";
import { detectarPicos } from "@/lib/picos";
import { sqlCategorias, sqlContarNotas, sqlPorCategoria, sqlSerieMensal, sqlTopFornecedores } from "@/lib/queries/gastos";
import { useOpcoes } from "@/lib/useOpcoes";
import { TabelaNotas } from "./TabelaNotas";

export function Gastos() {
  const { opcoes, deputados } = useOpcoes();
  const { filtros, definir } = useFiltros(opcoes);
  const cats = useConsulta<{ categoria: string }>(sqlCategorias());
  const total = useConsulta<{ n: number; total: number }>(sqlContarNotas(filtros));
  const serie = useConsulta<{ periodo: string; valor: number }>(sqlSerieMensal(filtros));
  const porCat = useConsulta<{ categoria: string; valor: number; n: number }>(sqlPorCategoria(filtros));
  const forn = useConsulta<{ cnpj: string | null; nome: string; valor: number; n: number; deputados: number }>(sqlTopFornecedores(filtros, 15));
  const dep = filtros.deputado ? deputados.get(filtros.deputado) : undefined;
  const t = total.dados?.[0];
  const pontos = serie.dados ?? [];
  return (
    <>
      <BarraFiltros opcoes={opcoes}>
        <Selecao rotulo="Categoria" valor={filtros.categoria} todos="Todas" opcoes={(cats.dados ?? []).map((c) => c.categoria)}
          onChange={(categoria) => definir({ categoria })} />
        {filtros.deputado ? (
          <button type="button" onClick={() => definir({ deputado: undefined })}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-verde bg-verde/10 px-3 text-sm">
            Deputado: {dep?.nome ?? filtros.deputado} <X size={14} aria-label="remover filtro de deputado" />
          </button>
        ) : null}
        {filtros.cnpj ? (
          <button type="button" onClick={() => definir({ cnpj: undefined })}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-verde bg-verde/10 px-3 text-sm">
            CNPJ: {filtros.cnpj} <X size={14} aria-label="remover filtro de fornecedor" />
          </button>
        ) : null}
      </BarraFiltros>
      {total.erro ? <Erro texto={total.erro} /> : null}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile rotulo="Total gasto" valor={t ? brlCurto(t.total ?? 0) : "…"} />
        <StatTile rotulo="Notas fiscais" valor={t ? num(t.n) : "…"} />
        <StatTile rotulo="Valor médio por nota" valor={t && t.n ? brl((t.total ?? 0) / t.n) : "—"} />
      </div>
      <p className="-mt-4 mb-6 text-right text-sm"><Link href={`/gastos/passagens/${paraQuery({ ...filtros, categoria: undefined })}`} className="text-destaque underline">Abrir análise de passagens aéreas →</Link></p>
      <div className="space-y-6">
        {serie.dados ? <SerieTemporal titulo="Evolução mensal do gasto" formato="brl"
          linhas={[{ nome: "Gasto", pontos, picos: detectarPicos(pontos) }]} /> : <Carregando />}
        <div className="grid gap-6 lg:grid-cols-2">
          {porCat.dados ? <Barras titulo="Por categoria" itens={porCat.dados.map((c) => ({ rotulo: c.categoria, valor: c.valor,
            detalhe: `${num(c.n)} notas`, href: `/gastos/?${new URLSearchParams({ ...strs(filtros), categoria: c.categoria })}` }))} /> : <Carregando />}
          {forn.dados ? <Barras titulo="Maiores fornecedores" subtitulo="Entre parênteses, quantos deputados pagaram o fornecedor." cor={1}
            itens={forn.dados.map((f) => ({ rotulo: `${f.nome} (${f.deputados})`, valor: f.valor, detalhe: `${num(f.n)} notas · ${f.deputados} deputado(s)`,
              href: f.cnpj && f.cnpj.length === 14 ? `/fornecedor/?cnpj=${f.cnpj}` : undefined }))} /> : <Carregando />}
        </div>
        <TabelaNotas filtros={filtros} />
      </div>
    </>
  );
}

function strs(f: object): Record<string, string> {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
}
