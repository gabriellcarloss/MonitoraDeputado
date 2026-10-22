"use client";

import Link from "next/link";
import { useState } from "react";
import { Barras } from "@/components/charts/Barras";
import { SerieTemporal } from "@/components/charts/SerieTemporal";
import { BarraFiltros, Campo, Selecao, useFiltros } from "@/components/filtros/Filtros";
import { Carregando, Erro, StatTile } from "@/components/ui/StatTile";
import { useConsulta } from "@/lib/duck";
import { data, num } from "@/lib/format";
import { detectarPicos } from "@/lib/picos";
import { sqlContarProposicoes, sqlProposicoes, sqlProposicoesMensal, sqlRankingAutores, sqlTiposETemas } from "@/lib/queries/proposicoes";
import { useOpcoes } from "@/lib/useOpcoes";

interface Linha { id: number; sigla_tipo: string; numero: number; ano: number; ementa: string; tema: string | null; data_apresentacao: string;
  situacao: string | null; relevante: boolean; url_inteiro_teor: string | null; deputado_id: number | null; autor: string | null; partido: string | null; uf: string | null }

const POR_PAGINA = 40;

export function Proposicoes() {
  const { opcoes } = useOpcoes();
  const { filtros, definir } = useFiltros(opcoes);
  const [pagina, setPagina] = useState(0);
  const tt = useConsulta<{ k: string; v: string; n: number }>(sqlTiposETemas());
  const tot = useConsulta<{ n: number; relevantes: number; viraram_lei: number }>(sqlContarProposicoes(filtros));
  const lista = useConsulta<Linha>(sqlProposicoes(filtros, POR_PAGINA, pagina * POR_PAGINA));
  const rank = useConsulta<{ deputado_id: number; nome: string; partido: string; uf: string; n: number }>(sqlRankingAutores(filtros, 15));
  const mensal = useConsulta<{ periodo: string; valor: number }>(sqlProposicoesMensal(filtros));
  const t = tot.dados?.[0];
  const pontos = mensal.dados ?? [];
  const paginas = t ? Math.max(1, Math.ceil(t.n / POR_PAGINA)) : 1;
  return (
    <>
      <BarraFiltros opcoes={opcoes}>
        <Selecao rotulo="Tipo" valor={filtros.tipo} opcoes={(tt.dados ?? []).filter((x) => x.k === "tipo").map((x) => [x.v, `${x.v} (${num(x.n)})`] as [string, string])}
          onChange={(tipo) => { setPagina(0); definir({ tipo }); }} />
        <Selecao rotulo="Tema" valor={filtros.tema} opcoes={(tt.dados ?? []).filter((x) => x.k === "tema").map((x) => x.v)}
          onChange={(tema) => { setPagina(0); definir({ tema }); }} />
        <Campo rotulo="Buscar na ementa">
          <input type="search" className="h-9 rounded-full border border-border bg-subtle/60 px-3 text-sm" defaultValue={filtros.busca ?? ""}
            placeholder="ex.: saúde" onChange={(e) => { setPagina(0); definir({ busca: e.target.value || undefined }); }} />
        </Campo>
      </BarraFiltros>
      {lista.erro ? <Erro texto={lista.erro} /> : null}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Proposições" valor={t ? num(t.n) : "…"} cor="azul" />
        <StatTile rotulo="Projetos (PL, PLP, PEC, PDL)" valor={t ? num(t.relevantes) : "…"} cor="verde" barra={t && t.n ? t.relevantes / t.n : 0} />
        <StatTile rotulo="Requerimentos e outros" valor={t ? num(t.n - t.relevantes) : "…"} cor="laranja" />
        <StatTile rotulo="Viraram lei" valor={t ? num(t.viraram_lei) : "…"} cor="amarelo" />
      </div>
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
          {mensal.dados ? <SerieTemporal titulo="Projetos apresentados por mês" barras formato="num" linhas={[{ nome: "Projetos", pontos, picos: detectarPicos(pontos) }]} /> : <Carregando />}
          {rank.dados ? <Barras titulo="Quem mais apresenta projetos" formato="num" cor={2}
            itens={rank.dados.map((r) => ({ rotulo: `${r.nome} (${r.partido}-${r.uf})`, valor: r.n, href: `/deputado/${r.deputado_id}/?aba=proposicoes` }))} /> : <Carregando />}
        </div>
        <section className="cartao p-4">
          <h2 className="font-display mb-3 text-xl leading-none">Proposições</h2>
          {!lista.dados ? <Carregando /> : lista.dados.length === 0 ? <p className="py-6 text-center text-sm text-muted">Nenhuma proposição com esses filtros.</p> : (
            <ul className="divide-y divide-border">
              {lista.dados.map((p) => (
                <li key={p.id} className="py-3 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.relevante ? "bg-verde text-white" : "bg-subtle text-muted"}`}>{p.sigla_tipo} {p.numero}/{p.ano}</span>
                    <span className="text-muted">{data(p.data_apresentacao)}</span>
                    {p.tema ? <span className="rounded-full border border-border px-2 py-0.5 text-xs">{p.tema}</span> : null}
                    {p.situacao ? <span className="text-xs text-muted">{p.situacao}</span> : null}
                  </p>
                  <p className="mt-1">{p.ementa}</p>
                  <p className="mt-1 text-xs text-muted">
                    {p.autor ? <>Autor: <Link href={`/deputado/${p.deputado_id}/?aba=proposicoes`} className="text-destaque hover:underline">{p.autor}</Link> ({p.partido}-{p.uf})</> : "Autor fora da Câmara"}
                    {p.url_inteiro_teor ? <> · <a href={p.url_inteiro_teor} target="_blank" rel="noopener noreferrer" className="text-destaque underline">inteiro teor</a></> : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {paginas > 1 ? (
            <div className="mt-3 flex items-center justify-end gap-2 text-sm">
              <button type="button" className="pilula" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
              <span className="text-muted">Página {pagina + 1} de {paginas}</span>
              <button type="button" className="pilula" disabled={pagina + 1 >= paginas} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
