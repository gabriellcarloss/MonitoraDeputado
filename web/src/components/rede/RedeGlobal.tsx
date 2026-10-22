"use client";

import Link from "next/link";
import { useState } from "react";
import { Rede } from "@/components/charts/Rede";
import { Carregando, Erro } from "@/components/ui/StatTile";
import { useConsulta } from "@/lib/duck";
import { brl, num } from "@/lib/format";
import { sqlArestasPassageiros, sqlPassageirosCompartilhados, sqlRedeFornecedoresCompartilhados } from "@/lib/queries/rede";
import type { NoRede, Rede as TRede } from "@/lib/types";

type Modo = "fornecedores" | "passageiros";

function montar(arestas: { o: string; ot: NoRede["tipo"]; orot: string; d: string; dt: NoRede["tipo"]; drot: string; valor: number; n: number }[]): TRede {
  const nos = new Map<string, NoRede>();
  for (const a of arestas) {
    for (const [id, tipo, rot] of [[`${a.ot}:${a.o}`, a.ot, a.orot], [`${a.dt}:${a.d}`, a.dt, a.drot]] as const) {
      const n = nos.get(id);
      if (n) n.valor += a.valor; else nos.set(id, { id, tipo, rotulo: rot, valor: a.valor });
    }
  }
  // Mantém os destinos (fornecedores/passageiros) e os deputados de maior valor, até 150 nós.
  const destinos = [...nos.values()].filter((n) => n.tipo !== "deputado");
  const deps = [...nos.values()].filter((n) => n.tipo === "deputado").sort((a, b) => b.valor - a.valor).slice(0, Math.max(0, 150 - destinos.length));
  const ok = new Set([...destinos, ...deps].map((n) => n.id));
  return {
    nos: [...destinos, ...deps],
    arestas: arestas.map((a) => ({ origem: `${a.ot}:${a.o}`, destino: `${a.dt}:${a.d}`, valor: a.valor, n: a.n }))
      .filter((a) => ok.has(a.origem) && ok.has(a.destino)),
  };
}

export function RedeGlobal() {
  const [modo, setModo] = useState<Modo>("fornecedores");
  const [minimo, setMinimo] = useState(10);
  const forn = useConsulta<{ fornecedor: string; nome_fornecedor: string; deputado_id: string; nome_deputado: string; valor: number; n: number }>(
    modo === "fornecedores" ? sqlRedeFornecedoresCompartilhados(minimo, 12) : null);
  const pass = useConsulta<{ deputado_id: string; nome_deputado: string; passageiro: string; valor: number; n: number }>(
    modo === "passageiros" ? sqlArestasPassageiros(2) : null);
  const tabela = useConsulta<{ passageiro: string; gabinetes: number; valor: number; passagens: number; deputados: string }>(
    modo === "passageiros" ? sqlPassageirosCompartilhados(2) : null);
  const rede = modo === "fornecedores"
    ? forn.dados && montar(forn.dados.map((a) => ({ o: a.deputado_id, ot: "deputado", orot: a.nome_deputado, d: a.fornecedor, dt: "fornecedor", drot: a.nome_fornecedor, valor: a.valor, n: a.n })))
    : pass.dados && montar(pass.dados.map((a) => ({ o: a.deputado_id, ot: "deputado", orot: a.nome_deputado, d: a.passageiro, dt: "passageiro", drot: a.passageiro, valor: a.valor, n: a.n })));
  const erro = forn.erro ?? pass.erro;
  return (
    <div className="space-y-6">
      <div className="cartao flex flex-wrap items-center gap-2 p-3">
        <button type="button" className="pilula" aria-pressed={modo === "fornecedores"} onClick={() => setModo("fornecedores")}>Fornecedores compartilhados</button>
        <button type="button" className="pilula" aria-pressed={modo === "passageiros"} onClick={() => setModo("passageiros")}>Passageiros em vários gabinetes</button>
        {modo === "fornecedores" ? (
          <label className="ml-auto flex items-center gap-2 text-sm text-muted">Mínimo de deputados por fornecedor
            <select className="h-9 rounded-full border border-border bg-subtle/60 px-3 text-sm" value={minimo} onChange={(e) => setMinimo(Number(e.target.value))}>
              {[3, 5, 10, 20, 50].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        ) : null}
      </div>
      {erro ? <Erro texto={erro} /> : !rede ? <Carregando /> : (
        <Rede rede={rede} titulo={modo === "fornecedores" ? "Fornecedores pagos por muitos deputados" : "Pessoas que voaram pela cota de mais de um deputado"}
          subtitulo={modo === "fornecedores" ? "Os 12 fornecedores com mais deputados clientes (respeitando o mínimo escolhido). Clique para abrir." : "Passageiros (que não são o deputado) ligados a 2 ou mais gabinetes."} />
      )}
      {modo === "passageiros" && tabela.dados ? (
        <section className="cartao p-4">
          <h2 className="font-display mb-3 text-xl leading-none">Passageiros recorrentes ({num(tabela.dados.length)})</h2>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="sticky top-0 bg-card text-left text-muted"><tr><th className="py-2 pr-3 font-medium">Passageiro</th><th className="py-2 pr-3 text-right font-medium">Gabinetes</th>
                <th className="py-2 pr-3 text-right font-medium">Passagens</th><th className="py-2 pr-3 text-right font-medium">Valor</th><th className="py-2 font-medium">Deputados</th></tr></thead>
              <tbody className="num">{tabela.dados.map((p) => (
                <tr key={p.passageiro} className="border-t border-border align-top">
                  <td className="py-1.5 pr-3"><Link className="text-destaque hover:underline" href={`/gastos/passagens/?passageiro=${encodeURIComponent(p.passageiro)}`}>{p.passageiro}</Link></td>
                  <td className="py-1.5 pr-3 text-right">{p.gabinetes}</td><td className="py-1.5 pr-3 text-right">{p.passagens}</td>
                  <td className="py-1.5 pr-3 text-right whitespace-nowrap">{brl(p.valor)}</td><td className="py-1.5 text-muted">{p.deputados}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
