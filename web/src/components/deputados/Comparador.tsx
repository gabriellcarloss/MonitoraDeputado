"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SerieTemporal } from "@/components/charts/SerieTemporal";
import { Foto } from "@/components/ui/Foto";
import { Carregando } from "@/components/ui/StatTile";
import { INDICADORES } from "@/lib/indicadores";
import type { DeputadoDetalhe, NomeIndicador } from "@/lib/types";
import { carregarJson } from "@/lib/useJson";

export function Comparador() {
  const sp = useSearchParams();
  const ids = (sp?.get("ids") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 4);
  const chave = ids.join(",");
  const [deps, setDeps] = useState<DeputadoDetalhe[] | null>(null);
  useEffect(() => {
    Promise.all(chave.split(",").filter(Boolean).map((id) => carregarJson<DeputadoDetalhe>(`/data/deputado/${id}.json`).catch(() => null)))
      .then((r) => setDeps(r.filter((x): x is DeputadoDetalhe => x !== null)));
  }, [chave]);
  if (!ids.length) return <p className="text-muted">Nenhum deputado selecionado. <Link href="/deputados/" className="text-destaque underline">Escolha na lista</Link>.</p>;
  if (!deps) return <Carregando />;
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto cartao">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className="p-3 text-left font-medium text-muted">Indicador</th>
              {deps.map((d) => (
                <th key={d.deputado.id} className="p-3 text-left">
                  <Link href={`/deputado/${d.deputado.id}/`} className="flex items-center gap-2 hover:underline">
                    <Foto src={d.deputado.foto} nome={d.deputado.nome} tamanho={36} />
                    <span>{d.deputado.nome}<span className="block text-xs font-normal text-muted">{d.deputado.partido_atual}-{d.deputado.uf}</span></span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="num">
            {(Object.keys(INDICADORES) as NomeIndicador[]).map((k) => (
              <tr key={k} className="border-t border-border">
                <td className="p-3" title={INDICADORES[k].ajuda}>{INDICADORES[k].rotulo}</td>
                {deps.map((d) => <td key={d.deputado.id} className="p-3">{INDICADORES[k].formato(d.indicadores?.[k])}</td>)}
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="p-3">Pontos de atenção</td>
              {deps.map((d) => <td key={d.deputado.id} className="p-3">{d.alertas.length}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
      <SerieTemporal titulo="Gasto mensal comparado" formato="brl"
        linhas={deps.map((d) => ({ nome: d.deputado.nome, pontos: d.series.find((s) => s.metrica === "gasto")?.pontos ?? [] }))} />
    </div>
  );
}
