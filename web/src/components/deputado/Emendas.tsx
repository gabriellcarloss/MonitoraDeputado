"use client";

import Link from "next/link";
import { Barras } from "@/components/charts/Barras";
import { SerieTemporal } from "@/components/charts/SerieTemporal";
import { StatTile } from "@/components/ui/StatTile";
import { brl, brlCurto, num, pct } from "@/lib/format";
import type { DeputadoDetalhe } from "@/lib/types";

/** Aba "Emendas": emendas individuais do deputado a partir do orçamento de 2024 (Portal da Transparência / CGU). */
export function EmendasDeputado({ d }: { d: DeputadoDetalhe }) {
  const e = d.emendas;
  if (!e || e.n === 0) {
    return (
      <p className="cartao p-4 text-sm text-muted">
        Nenhuma emenda individual atribuída a este deputado a partir do orçamento de 2024. A atribuição é feita pelo nome do
        autor no Portal da Transparência; veja a metodologia na página <Link href="/sobre/#emendas" className="text-destaque underline">Sobre os dados</Link>.
      </p>
    );
  }
  const execucao = e.empenhado > 0 ? e.pago / e.empenhado : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Empenhado" valor={brlCurto(e.empenhado)} detalhe={`${num(e.n)} emendas`} cor="azul" />
        <StatTile rotulo="Pago" valor={brlCurto(e.pago)} detalhe={`${pct(execucao, 0)} do empenhado${e.restos_pagos ? ` · + ${brlCurto(e.restos_pagos)} de restos a pagar` : ""}`}
          cor="verde" barra={execucao} />
        <StatTile rotulo="Transferência especial (Pix)" valor={brlCurto(e.pix)} detalhe={`${pct(e.empenhado ? e.pix / e.empenhado : 0, 0)} do empenhado`}
          cor="laranja" barra={e.empenhado ? e.pix / e.empenhado : 0} />
        <StatTile rotulo={`Recebido fora de ${d.deputado.uf}`} valor={brlCurto(e.fora_uf)}
          detalhe={`${pct(e.recebido ? e.fora_uf / e.recebido : 0, 0)} do que já chegou aos destinatários`}
          cor="amarelo" barra={e.recebido ? e.fora_uf / e.recebido : 0} />
      </div>
      <SerieTemporal titulo="Emendas por ano do orçamento" formato="brl" barras altura={240}
        subtitulo="Empenhado (reservado no orçamento) e pago até agora."
        linhas={[
          { nome: "Empenhado", pontos: e.por_ano.map((x) => ({ periodo: String(x.ano), valor: x.empenhado })) },
          { nome: "Pago", pontos: e.por_ano.map((x) => ({ periodo: String(x.ano), valor: x.pago })) },
        ]} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Barras titulo="Por área (função de governo)" itens={e.por_funcao.map((x) => ({ rotulo: x.rotulo, valor: x.valor }))} />
        <Barras titulo="Para onde foi o dinheiro" subtitulo="Município e UF de quem recebeu (bancos que só intermedeiam o repasse ficam fora)." cor={1}
          itens={e.por_local.map((x) => ({ rotulo: x.rotulo, valor: x.valor, detalhe: x.uf && x.uf !== d.deputado.uf ? `fora de ${d.deputado.uf}` : undefined }))} />
      </div>
      {e.favorecidos.length ? (
        <section className="cartao p-4">
          <h2 className="font-display text-xl leading-none">Quem recebeu</h2>
          <p className="mb-2 text-sm text-muted">Maiores favorecidos dos pagamentos (prefeituras, estados, entidades e empresas).</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-muted"><tr>
                <th className="py-1 pr-3 font-medium">Favorecido</th><th className="py-1 pr-3 font-medium">Natureza</th>
                <th className="py-1 pr-3 font-medium">Local</th><th className="py-1 text-right font-medium">Recebido</th>
              </tr></thead>
              <tbody className="num">{e.favorecidos.map((f, i) => (
                <tr key={`${f.nome}-${i}`} className="border-t border-border">
                  <td className="py-1 pr-3">{f.nome}</td><td className="py-1 pr-3 text-muted">{f.natureza ?? "—"}</td>
                  <td className="py-1 pr-3 text-muted">{[f.municipio, f.uf].filter(Boolean).join("/") || "—"}</td>
                  <td className="py-1 text-right whitespace-nowrap">{brl(f.valor)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}
      <section className="cartao p-4">
        <h2 className="font-display text-xl leading-none">Emendas ({num(e.n)})</h2>
        <p className="mb-2 text-sm text-muted">As maiores por valor empenhado. Use o código para conferir no{" "}
          <a href="https://portaldatransparencia.gov.br/emendas" target="_blank" rel="noopener noreferrer" className="text-destaque underline">Portal da Transparência</a>.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-muted"><tr>
              <th className="py-1 pr-3 font-medium">Código</th><th className="py-1 pr-3 font-medium">Ano</th><th className="py-1 pr-3 font-medium">Destino</th>
              <th className="py-1 pr-3 font-medium">Área</th><th className="py-1 pr-3 text-right font-medium">Empenhado</th><th className="py-1 text-right font-medium">Pago</th>
            </tr></thead>
            <tbody className="num">{e.lista.map((x) => (
              <tr key={x.codigo} className="border-t border-border align-top">
                <td className="py-1 pr-3">
                  <span className="select-all">{x.codigo}</span>
                  {x.pix ? <span className="ml-1 rounded border border-atencao/60 bg-atencao/15 px-1 text-[10px] font-semibold uppercase">Pix</span> : null}
                </td>
                <td className="py-1 pr-3">{x.ano ?? "—"}</td>
                <td className="py-1 pr-3">{x.localidade ?? x.uf ?? "—"}</td>
                <td className="py-1 pr-3 text-muted">{x.funcao ?? "—"}</td>
                <td className="py-1 pr-3 text-right whitespace-nowrap">{brl(x.empenhado)}</td>
                <td className="py-1 text-right whitespace-nowrap">{brl(x.pago)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Fonte: Portal da Transparência (CGU). &ldquo;Pix&rdquo; = transferência especial, que cai direto no caixa
          do município ou estado sem objeto definido.</p>
      </section>
    </div>
  );
}
