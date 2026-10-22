"use client";

import Link from "next/link";
import { SerieTemporal } from "@/components/charts/SerieTemporal";
import { BarraFiltros, Campo, Selecao, useFiltros } from "@/components/filtros/Filtros";
import { Carregando, Erro, StatTile } from "@/components/ui/StatTile";
import { useConsulta } from "@/lib/duck";
import { data, num } from "@/lib/format";
import { detectarPicos } from "@/lib/picos";
import { sqlVotacoes, sqlVotacoesMensal } from "@/lib/queries/votacoes";
import { useOpcoes } from "@/lib/useOpcoes";
import { Placar } from "./Placar";

interface Linha { id: string; data: string; sigla_orgao: string; descricao: string; aprovacao: number | null; n_votos: number; sim: number; nao: number; outros: number }

export function Votacoes() {
  const { opcoes } = useOpcoes();
  const { filtros, definir } = useFiltros(opcoes);
  const orgaos = useConsulta<{ sigla_orgao: string; n: number }>({ sql: "SELECT sigla_orgao, count(*) AS n FROM votacoes GROUP BY 1 ORDER BY 2 DESC", params: [] });
  const lista = useConsulta<Linha>(sqlVotacoes(filtros));
  const mensal = useConsulta<{ periodo: string; valor: number }>(sqlVotacoesMensal(filtros));
  const l = lista.dados ?? [];
  const aprovadas = l.filter((v) => v.aprovacao === 1).length;
  const apertadas = l.filter((v) => v.sim + v.nao > 0 && Math.abs(v.sim - v.nao) / (v.sim + v.nao) < 0.1).length;
  const pontos = mensal.dados ?? [];
  return (
    <>
      <BarraFiltros opcoes={opcoes} semUfPartido>
        <Selecao rotulo="Órgão" valor={filtros.orgao} opcoes={(orgaos.dados ?? []).map((o) => [o.sigla_orgao, `${o.sigla_orgao} (${o.n})`] as [string, string])}
          onChange={(orgao) => definir({ orgao })} />
        <Campo rotulo="Buscar na descrição">
          <input type="search" className="h-9 rounded-full border border-border bg-subtle/60 px-3 text-sm" defaultValue={filtros.busca ?? ""}
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
        {mensal.dados ? <SerieTemporal titulo="Votações por mês" barras formato="num" linhas={[{ nome: "Votações", pontos, picos: detectarPicos(pontos) }]} altura={240} /> : <Carregando />}
        <section className="cartao p-4">
          <h2 className="font-display mb-3 text-xl leading-none">Votações</h2>
          {!lista.dados ? <Carregando /> : l.length === 0 ? <p className="py-6 text-center text-sm text-muted">Nenhuma votação com esses filtros.</p> : (
            <ul className="divide-y divide-border">
              {l.map((v) => (
                <li key={v.id}>
                  <Link href={`/votacao/?id=${encodeURIComponent(v.id)}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-2 py-3 hover:bg-subtle">
                    <span className="num w-24 shrink-0 text-sm text-muted">{data(v.data)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{v.descricao}</span>
                      <span className="text-xs text-muted">{v.sigla_orgao} · {v.aprovacao === 1 ? "aprovada" : v.aprovacao === 0 ? "rejeitada" : "—"}</span>
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
