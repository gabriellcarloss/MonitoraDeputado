"use client";

import Link from "next/link";
import { Barras } from "@/components/charts/Barras";
import { SerieTemporal } from "@/components/charts/SerieTemporal";
import { BarraFiltros, Campo, Selecao, useFiltros } from "@/components/filtros/Filtros";
import { Carregando, Erro, StatTile } from "@/components/ui/StatTile";
import { useConsulta } from "@/lib/duck";
import { data, num, pct } from "@/lib/format";
import { detectarPicos } from "@/lib/picos";
import { sqlTemasDasVotacoes, sqlVotacoes, sqlVotacoesMensal, sqlVotacoesPorTema } from "@/lib/queries/votacoes";
import { useOpcoes } from "@/lib/useOpcoes";
import { Placar } from "./Placar";
import { Exportar } from "@/components/ui/Exportar";

interface Linha { id: string; data: string; sigla_orgao: string; descricao: string; aprovacao: number | null; tema: string | null; n_votos: number; sim: number; nao: number; outros: number }

export function Votacoes() {
  const { opcoes } = useOpcoes();
  const { filtros, definir } = useFiltros(opcoes);
  const orgaos = useConsulta<{ sigla_orgao: string; n: number }>({ sql: "SELECT sigla_orgao, count(*) AS n FROM votacoes GROUP BY 1 ORDER BY 2 DESC", params: [] });
  const lista = useConsulta<Linha>(sqlVotacoes(filtros));
  const mensal = useConsulta<{ periodo: string; valor: number }>(sqlVotacoesMensal(filtros));
  const temas = useConsulta<{ tema: string; n: number }>(sqlTemasDasVotacoes());
  const porTema = useConsulta<{ tema: string; n: number; aprovadas: number; decididas: number }>(sqlVotacoesPorTema(filtros));
  const l = lista.dados ?? [];
  const aprovadas = l.filter((v) => v.aprovacao === 1).length;
  const apertadas = l.filter((v) => v.sim + v.nao > 0 && Math.abs(v.sim - v.nao) / (v.sim + v.nao) < 0.1).length;
  const pontos = mensal.dados ?? [];
  return (
    <>
      <BarraFiltros opcoes={opcoes} semUfPartido>
        <Selecao rotulo="Órgão" valor={filtros.orgao} opcoes={(orgaos.dados ?? []).map((o) => [o.sigla_orgao, `${o.sigla_orgao} (${o.n})`] as [string, string])}
          onChange={(orgao) => definir({ orgao })} />
        <Selecao rotulo="Tema" valor={filtros.tema} opcoes={(temas.dados ?? []).map((t) => [t.tema, `${t.tema} (${num(t.n)})`] as [string, string])}
          onChange={(tema) => definir({ tema })} />
        <Campo rotulo="Buscar na descrição">
          <input type="search" className="campo-filtro" defaultValue={filtros.busca ?? ""}
            placeholder="ex.: PEC, reforma" onChange={(e) => definir({ busca: e.target.value || undefined })} />
        </Campo>
      </BarraFiltros>
      {lista.erro ? <Erro texto={lista.erro} /> : null}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Votações nominais" valor={lista.dados ? num(l.length) : "…"} detalhe={l.length >= 300 ? "mostrando as 300 mais recentes" : undefined} />
        <StatTile rotulo="Aprovadas" valor={lista.dados ? num(aprovadas) : "…"} cor="verde" barra={l.length ? aprovadas / l.length : 0} />
        <StatTile rotulo="Placar apertado" valor={lista.dados ? num(apertadas) : "…"} detalhe="diferença menor que 10%" cor="amarelo" />
        <StatTile rotulo="Média de votos" valor={l.length ? num(l.reduce((s, v) => s + v.n_votos, 0) / l.length) : "…"} detalhe="deputados por votação" cor="azul" />
      </div>
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          {porTema.dados ? (
            <Barras titulo="Votações por tema" formato="num" subtitulo="Clique em um tema para filtrar a lista."
              itens={porTema.dados.map((t) => ({ rotulo: t.tema, valor: t.n, detalhe: t.decididas ? `${pct(t.aprovadas / t.decididas, 0)} aprovadas` : undefined,
                acao: () => definir({ tema: filtros.tema === t.tema ? undefined : t.tema }) }))} />
          ) : <Carregando />}
          {porTema.dados ? (
            <Barras titulo="Taxa de aprovação por tema" formato="pct" cor={1} subtitulo="Só temas com pelo menos 5 votações decididas."
              itens={porTema.dados.filter((t) => t.decididas >= 5).map((t) => ({ rotulo: t.tema, valor: t.aprovadas / t.decididas, detalhe: `${t.aprovadas} de ${t.decididas}`,
                acao: () => definir({ tema: filtros.tema === t.tema ? undefined : t.tema }) })).sort((a, b) => b.valor - a.valor)} />
          ) : <Carregando />}
        </div>
        {mensal.dados ? <SerieTemporal titulo="Votações por mês" barras formato="num" linhas={[{ nome: "Votações", pontos, picos: detectarPicos(pontos) }]} altura={240} /> : <Carregando />}
        <section className="cartao p-4" data-revelar>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-display flex-1 text-xl leading-none">Votações</h2>
            <Exportar nome="Votações" compacto obter={() => ({ colunas: ["ID", "Data", "Órgão", "Tema", "Descrição", "Aprovada", "Votos", "Sim", "Não", "Outros"],
              linhas: l.map((v) => [v.id, v.data, v.sigla_orgao, v.tema, v.descricao, v.aprovacao === null ? "" : v.aprovacao ? "sim" : "não", v.n_votos, v.sim, v.nao, v.outros]) })} />
          </div>
          {!lista.dados ? <Carregando /> : l.length === 0 ? <p className="py-6 text-center text-sm text-muted">Nenhuma votação com esses filtros.</p> : (
            <ul className="divide-y divide-border">
              {l.map((v) => (
                <li key={v.id}>
                  <Link href={`/votacao/?id=${encodeURIComponent(v.id)}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-2 py-3 hover:bg-subtle">
                    <span className="num w-24 shrink-0 text-sm text-muted">{data(v.data)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{v.descricao}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        {v.tema ? <span className="rounded-full border border-border bg-subtle px-2 py-0.5 font-medium text-fg">{v.tema}</span> : null}
                        {v.sigla_orgao} · {v.aprovacao === 1 ? "aprovada" : v.aprovacao === 0 ? "rejeitada" : "—"}</span>
                    </span>
                    <Placar sim={v.sim} nao={v.nao} outros={v.outros} compacto />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
