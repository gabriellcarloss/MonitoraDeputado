"use client";

import Link from "next/link";
import { Barras } from "@/components/charts/Barras";
import { BarraFiltros, Campo, useFiltros } from "@/components/filtros/Filtros";
import { Carregando, StatTile } from "@/components/ui/StatTile";
import { useConsulta } from "@/lib/duck";
import { brl, brlCurto, num } from "@/lib/format";
import { sqlPassageirosTerceiros, sqlPassagens, sqlRankingTerceiros } from "@/lib/queries/gastos";
import { useOpcoes } from "@/lib/useOpcoes";
import { TabelaNotas } from "./TabelaNotas";

export function Passagens() {
  const { opcoes, deputados } = useOpcoes();
  const { filtros, definir } = useFiltros(opcoes);
  const trechos = useConsulta<{ trecho: string | null; n: number; valor: number; terceiros: number }>(sqlPassagens(filtros));
  const terceiros = useConsulta<{ passageiro: string; n: number; valor: number; deputados: number; nomes_deputados: string }>(sqlPassageirosTerceiros(filtros));
  const ranking = useConsulta<{ deputado_id: number; nome: string; partido: string; uf: string; n: number; valor: number }>(sqlRankingTerceiros(filtros));
  const tot = trechos.dados?.reduce((a, t) => ({ n: a.n + t.n, v: a.v + t.valor, t: a.t + t.terceiros }), { n: 0, v: 0, t: 0 });
  const vTerceiros = terceiros.dados?.reduce((s, p) => s + p.valor, 0) ?? 0;
  const dep = filtros.deputado ? deputados.get(filtros.deputado) : undefined;
  return (
    <>
      <BarraFiltros opcoes={opcoes}>
        <Campo rotulo="Passageiro">
          <input type="search" className="h-9 rounded-md border border-border bg-card px-2 text-sm" defaultValue={filtros.passageiro ?? ""}
            placeholder="nome do passageiro" onChange={(e) => definir({ passageiro: e.target.value || undefined })} />
        </Campo>
      </BarraFiltros>
      {dep ? <p className="mb-4 text-sm">Mostrando passagens de <Link href={`/deputado/${dep.id}/`} className="font-semibold text-destaque underline">{dep.nome}</Link>.{" "}
        <button type="button" className="text-muted underline" onClick={() => definir({ deputado: undefined })}>Ver de todos</button></p> : null}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Passagens" valor={tot ? num(tot.n) : "…"} />
        <StatTile rotulo="Valor total" valor={tot ? brlCurto(tot.v) : "…"} />
        <StatTile rotulo="Emitidas para terceiros" valor={tot ? num(tot.t) : "…"} detalhe={tot && tot.n ? `${((tot.t / tot.n) * 100).toFixed(1).replace(".", ",")}% das passagens` : undefined} />
        <StatTile rotulo="Valor para terceiros" valor={terceiros.dados ? brlCurto(vTerceiros) : "…"} />
      </div>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {ranking.dados ? <Barras titulo="Deputados que mais emitem passagens para terceiros" formato="num"
            itens={ranking.dados.map((r) => ({ rotulo: `${r.nome} (${r.partido}-${r.uf})`, valor: r.n, detalhe: brl(r.valor), href: `/gastos/passagens/?deputado=${r.deputado_id}` }))} /> : <Carregando />}
          {trechos.dados ? <Barras titulo="Trechos mais caros" cor={1}
            itens={trechos.dados.slice(0, 15).map((t) => ({ rotulo: t.trecho ?? "sem trecho", valor: t.valor, detalhe: `${num(t.n)} passagens · ${num(t.terceiros)} para terceiros` }))} /> : <Carregando />}
        </div>
        <section className="cartao p-4">
          <h2 className="font-display text-xl leading-none">Quem voou com dinheiro da cota sem ser deputado</h2>
          <p className="mb-2 text-sm text-muted">Passageiros diferentes do deputado titular da nota. Assessores podem viajar a serviço — o dado mostra quem e quanto, a interpretação é sua.
            Destaque: pessoas que voaram pela cota de <strong>mais de um</strong> gabinete.</p>
          {!terceiros.dados ? <Carregando /> : terceiros.dados.length === 0 ? <p className="py-4 text-sm text-muted">Nenhuma passagem para terceiros com esses filtros.</p> : (
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 bg-card text-left text-muted"><tr>
                  <th className="py-2 pr-3 font-medium">Passageiro</th><th className="py-2 pr-3 text-right font-medium">Passagens</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor</th><th className="py-2 font-medium">Pagas por</th></tr></thead>
                <tbody className="num">{terceiros.dados.map((p) => (
                  <tr key={p.passageiro} className="border-t border-border align-top">
                    <td className="py-2 pr-3"><button type="button" className="text-left text-destaque hover:underline" onClick={() => definir({ passageiro: p.passageiro })}>{p.passageiro}</button>
                      {p.deputados > 1 ? <span className="ml-1 rounded border border-alta/50 bg-alta/10 px-1 text-[10px] font-semibold uppercase">{p.deputados} gabinetes</span> : null}</td>
                    <td className="py-2 pr-3 text-right">{p.n}</td><td className="py-2 pr-3 text-right whitespace-nowrap">{brl(p.valor)}</td>
                    <td className="py-2 text-muted">{p.nomes_deputados}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
        <TabelaNotas filtros={{ ...filtros, so_passagens: true }} />
      </div>
    </>
  );
}
