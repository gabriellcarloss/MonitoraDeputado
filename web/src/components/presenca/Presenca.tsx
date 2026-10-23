"use client";

import { SerieTemporal } from "@/components/charts/SerieTemporal";
import { BarraFiltros, useFiltros } from "@/components/filtros/Filtros";
import { Ranking } from "@/components/ui/Ranking";
import { Carregando, Erro, StatTile } from "@/components/ui/StatTile";
import { useConsulta } from "@/lib/duck";
import { num, pct } from "@/lib/format";
import { sqlPresencaMensal, sqlRankingPresenca } from "@/lib/queries/presenca";
import { useOpcoes } from "@/lib/useOpcoes";
import Link from "next/link";

interface Linha { deputado_id: number; nome: string; partido: string; uf: string; sessoes: number; presentes: number; justificadas: number; pct: number }

export function Presenca() {
  const { opcoes, deputados } = useOpcoes();
  const { filtros } = useFiltros(opcoes);
  const r = useConsulta<Linha>(sqlRankingPresenca(filtros, "asc"));
  const m = useConsulta<{ periodo: string; valor: number; sessoes: number }>(sqlPresencaMensal(filtros));
  const l = (r.dados ?? []).filter((x) => x.sessoes >= 5);
  const media = l.length ? l.reduce((s, x) => s + x.pct, 0) / l.length : null;
  const abaixo70 = l.filter((x) => x.pct < 0.7).length;
  const item = (x: Linha) => ({ id: x.deputado_id, nome: x.nome, partido: x.partido, uf: x.uf, foto: deputados.get(x.deputado_id)?.foto,
    valor: pct(x.pct), proporcao: x.pct });
  return (
    <>
      <BarraFiltros opcoes={opcoes} />
      {r.erro ? <Erro texto={r.erro} /> : null}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Presença média" valor={media === null ? "…" : pct(media)} cor="verde" barra={media ?? 0} />
        <StatTile rotulo="Sessões no período" valor={m.dados ? num(m.dados.reduce((s, x) => s + x.sessoes, 0)) : "…"} cor="azul" />
        <StatTile rotulo="Abaixo de 70%" valor={r.dados ? num(abaixo70) : "…"} detalhe="deputados com 5+ sessões" cor="vermelho" barra={l.length ? abaixo70 / l.length : 0} />
        <StatTile rotulo="100% de presença" valor={r.dados ? num(l.filter((x) => x.pct === 1).length) : "…"} cor="amarelo" />
      </div>
      <div className="space-y-6">
        {m.dados ? <SerieTemporal titulo="Presença média por mês" formato="pct" linhas={[{ nome: "Presença", pontos: m.dados }]} altura={240} /> : <Carregando />}
        {!r.dados ? <Carregando /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Ranking titulo="Menor presença" itens={l.slice(0, 10).map(item)} cor="bg-alta" />
            <Ranking titulo="Maior presença" itens={[...l].reverse().slice(0, 10).map(item)} cor="bg-verde" />
          </div>
        )}
        <section className="cartao p-4">
          <h2 className="font-display mb-1 text-xl leading-none">Todos os deputados</h2>
          <p className="mb-3 text-sm text-muted">Presença em sessões deliberativas no período filtrado. Ausências justificadas oficialmente
            (licença médica, missão autorizada) não contam como falta e ficam fora da conta. Participação em votações refere-se à legislatura inteira.</p>
          {!r.dados ? <Carregando /> : (
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="sticky top-0 bg-card text-left text-muted"><tr>
                  <th className="py-2 pr-3 font-medium">Deputado</th><th className="py-2 pr-3 text-right font-medium">Sessões</th>
                  <th className="py-2 pr-3 text-right font-medium">Presente</th><th className="py-2 pr-3 text-right font-medium">Justificadas</th>
                  <th className="py-2 pr-3 font-medium">Presença</th>
                  <th className="py-2 text-right font-medium">Participação em votações</th></tr></thead>
                <tbody className="num">{r.dados.map((x) => {
                  const part = deputados.get(x.deputado_id)?.indicadores?.pct_participacao_votacoes;
                  return (
                    <tr key={x.deputado_id} className="border-t border-border">
                      <td className="py-1.5 pr-3"><Link href={`/deputado/${x.deputado_id}/?aba=presenca`} className="hover:underline">{x.nome}</Link> <span className="text-muted">({x.partido}-{x.uf})</span></td>
                      <td className="py-1.5 pr-3 text-right">{x.sessoes}</td>
                      <td className="py-1.5 pr-3 text-right">{x.presentes}</td>
                      <td className="py-1.5 pr-3 text-right">{x.justificadas || "—"}</td>
                      <td className="py-1.5 pr-3"><span className="flex items-center gap-2"><span className="h-1.5 w-24 overflow-hidden rounded-full bg-subtle"><span className={`block h-full ${x.pct < 0.7 ? "bg-alta" : "bg-verde"}`} style={{ width: `${x.pct * 100}%` }} /></span>{pct(x.pct)}</span></td>
                      <td className="py-1.5 text-right">{part == null ? "—" : pct(part)}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
