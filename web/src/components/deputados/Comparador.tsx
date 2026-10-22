"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SerieTemporal } from "@/components/charts/SerieTemporal";
import { Foto } from "@/components/ui/Foto";
import { Carregando } from "@/components/ui/StatTile";
import { useConsulta } from "@/lib/duck";
import { INDICADORES } from "@/lib/indicadores";
import { sqlSeriesGasto } from "@/lib/queries/deputado";
import type { DeputadoResumo, NomeIndicador } from "@/lib/types";
import { useJson } from "@/lib/useJson";

export function Comparador() {
  const sp = useSearchParams();
  const ids = (sp?.get("ids") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 4);
  const { dados } = useJson<DeputadoResumo[]>(ids.length ? "/data/deputados.json" : null);
  const series = useConsulta<{ chave: string; periodo: string; valor: number }>(ids.length ? sqlSeriesGasto(ids) : null);
  if (!ids.length) return <p className="text-muted">Nenhum deputado selecionado. <Link href="/deputados/" className="text-destaque underline">Escolha na lista</Link>.</p>;
  if (!dados) return <Carregando />;
  const deps = ids.map((id) => dados.find((d) => d.id === id)).filter((d): d is DeputadoResumo => !!d);
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto cartao">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className="p-3 text-left font-medium text-muted">Indicador</th>
              {deps.map((d) => (
                <th key={d.id} className="p-3 text-left">
                  <Link href={`/deputado/${d.id}/`} className="flex items-center gap-2 hover:underline">
                    <Foto src={d.foto} nome={d.nome} tamanho={36} />
                    <span>{d.nome}<span className="block text-xs font-normal text-muted">{d.partido_atual}-{d.uf}</span></span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="num">
            {(Object.keys(INDICADORES) as NomeIndicador[]).map((k) => (
              <tr key={k} className="border-t border-border">
                <td className="p-3" title={INDICADORES[k].ajuda}>{INDICADORES[k].rotulo}</td>
                {deps.map((d) => <td key={d.id} className="p-3">{INDICADORES[k].formato(d.indicadores?.[k])}</td>)}
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="p-3">Pontos de atenção</td>
              {deps.map((d) => <td key={d.id} className="p-3">{d.n_alertas}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
      {series.dados ? (
        <SerieTemporal titulo="Gasto mensal comparado" formato="brl"
          linhas={deps.map((d) => ({ nome: d.nome, pontos: series.dados!.filter((s) => s.chave === String(d.id)).map(({ periodo, valor }) => ({ periodo, valor })) }))} />
      ) : <Carregando />}
    </div>
  );
}
