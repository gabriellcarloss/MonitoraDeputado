"use client";

import type { EChartsOption } from "echarts";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Cartao, TabelaSimples } from "@/components/charts/Cartao";
import { eixoBase, tooltipBase, useCores } from "@/components/charts/cores";
import { EChart } from "@/components/charts/EChart";
import { Carregando, Erro, StatTile, Titulo } from "@/components/ui/StatTile";
import { useConsulta } from "@/lib/duck";
import { data, num } from "@/lib/format";
import { sqlOrientacoes, sqlPlacarPartidos, sqlVotacao, sqlVotosDaVotacao } from "@/lib/queries/votacoes";

interface Voto { deputado_id: number; nome: string; uf: string; partido: string; voto: string; orientacao_partido: string | null; dissidente: boolean }
interface Partido { partido: string; total: number; sim: number; nao: number; outros: number; orientacao: string | null }

function PorPartido({ dados }: { dados: Partido[] }) {
  const c = useCores();
  const cats = dados.map((d) => d.partido).reverse();
  const serie = (nome: string, k: "sim" | "nao" | "outros", cor: string) => ({
    name: nome, type: "bar" as const, stack: "t", barMaxWidth: 18, itemStyle: { color: cor, borderColor: c.superficie, borderWidth: 1 },
    data: [...dados].reverse().map((d) => d[k]),
  });
  const option: EChartsOption = {
    grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
    legend: { top: 0, left: 0, textStyle: { color: c.muted } },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...tooltipBase(c) },
    xAxis: { type: "value", ...eixoBase(c) },
    yAxis: { type: "category", data: cats, ...eixoBase(c), axisLabel: { color: c.texto, fontSize: 12 } },
    series: [serie("Sim", "sim", c.series[0]), serie("Não", "nao", c.series[4]), serie("Outros", "outros", c.eixo)],
  };
  return (
    <Cartao titulo="Como cada partido votou" subtitulo="Votos do partido na data da votação."
      tabela={<TabelaSimples colunas={["Partido", "Orientação", "Sim", "Não", "Outros"]} linhas={dados.map((d) => [d.partido, d.orientacao ?? "—", d.sim, d.nao, d.outros])} />}>
      <EChart option={option} altura={Math.max(220, dados.length * 26 + 50)} />
    </Cartao>
  );
}

export function Votacao() {
  const id = useSearchParams()?.get("id") ?? "";
  const v = useConsulta<{ id: string; data: string; sigla_orgao: string; descricao: string; aprovacao: number | null }>(id ? sqlVotacao(id) : null);
  const votos = useConsulta<Voto>(id ? sqlVotosDaVotacao(id) : null);
  const partidos = useConsulta<Partido>(id ? sqlPlacarPartidos(id) : null);
  const orient = useConsulta<{ bancada: string; orientacao: string }>(id ? sqlOrientacoes(id) : null);
  const [so, setSo] = useState<"todos" | "dissidentes">("todos");
  if (!id) return <Titulo sub="Escolha uma votação na lista.">Votação</Titulo>;
  if (v.erro) return <Erro texto={v.erro} />;
  if (!v.dados) return <Carregando />;
  const vt = v.dados[0];
  if (!vt) return <Titulo sub={<Link className="text-destaque underline" href="/votacoes/">Voltar às votações</Link>}>Votação não encontrada</Titulo>;
  const vs = votos.dados ?? [];
  const sim = vs.filter((x) => x.voto === "Sim").length;
  const nao = vs.filter((x) => x.voto === "Não").length;
  const diss = vs.filter((x) => x.dissidente);
  const lista = so === "dissidentes" ? diss : vs;
  return (
    <>
      <Titulo sobretitulo={`${vt.sigla_orgao} · ${data(vt.data)}`} sub={vt.aprovacao === 1 ? "Resultado: aprovada" : vt.aprovacao === 0 ? "Resultado: rejeitada" : undefined}>{vt.descricao}</Titulo>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Sim" valor={num(sim)} cor="verde" barra={vs.length ? sim / vs.length : 0} />
        <StatTile rotulo="Não" valor={num(nao)} cor="vermelho" barra={vs.length ? nao / vs.length : 0} />
        <StatTile rotulo="Outros" valor={num(vs.length - sim - nao)} detalhe="abstenção, obstrução, art. 17" cor="laranja" />
        <StatTile rotulo="Contra o próprio partido" valor={num(diss.length)} cor="amarelo" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        {partidos.dados ? <PorPartido dados={partidos.dados} /> : <Carregando />}
        <section className="cartao p-4">
          <h2 className="font-display mb-3 text-xl leading-none">Orientações</h2>
          {!orient.dados ? <Carregando /> : (
            <ul className="flex flex-wrap gap-2">
              {orient.dados.map((o) => (
                <li key={o.bancada} className="rounded-full border border-border px-3 py-1 text-sm">
                  <span className="font-semibold">{o.bancada}</span>: <span className={o.orientacao === "Sim" ? "text-destaque" : o.orientacao === "Não" ? "text-alta" : "text-muted"}>{o.orientacao}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="cartao mt-6 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-display flex-1 text-xl leading-none">Votos nominais</h2>
          <button type="button" className="pilula" aria-pressed={so === "todos"} onClick={() => setSo("todos")}>Todos ({vs.length})</button>
          <button type="button" className="pilula" aria-pressed={so === "dissidentes"} onClick={() => setSo("dissidentes")}>Contra o partido ({diss.length})</button>
        </div>
        {!votos.dados ? <Carregando /> : (
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 bg-card text-left text-muted"><tr><th className="py-2 pr-3 font-medium">Deputado</th><th className="py-2 pr-3 font-medium">Partido-UF</th><th className="py-2 pr-3 font-medium">Voto</th><th className="py-2 font-medium">Partido orientou</th></tr></thead>
              <tbody>{lista.map((x) => (
                <tr key={x.deputado_id} className="border-t border-border">
                  <td className="py-1.5 pr-3"><Link href={`/deputado/${x.deputado_id}/?aba=votacoes`} className="hover:underline">{x.nome}</Link></td>
                  <td className="py-1.5 pr-3 text-muted">{x.partido}-{x.uf}</td>
                  <td className="py-1.5 pr-3 font-semibold">{x.voto}{x.dissidente ? <span className="ml-1 rounded border border-atencao/60 bg-atencao/15 px-1 text-[10px] font-semibold uppercase">contra</span> : null}</td>
                  <td className="py-1.5">{x.orientacao_partido ?? "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
