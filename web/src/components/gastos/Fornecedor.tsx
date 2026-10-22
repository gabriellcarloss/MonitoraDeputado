"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Rede } from "@/components/charts/Rede";
import { SerieTemporal } from "@/components/charts/SerieTemporal";
import { Carregando, Erro, StatTile, Titulo } from "@/components/ui/StatTile";
import { useConsulta } from "@/lib/duck";
import { brl, brlCurto, data, num } from "@/lib/format";
import { detectarPicos } from "@/lib/picos";
import { sqlDeputadosDoFornecedor, sqlFornecedor, sqlRedeFornecedor, sqlSerieFornecedor } from "@/lib/queries/gastos";
import type { NoRede, Rede as TRede } from "@/lib/types";
import { TabelaNotas } from "./TabelaNotas";

interface Receita {
  cnpj: string; razao_social: string | null; nome_fantasia: string | null; abertura: string | number | null; situacao: string | null;
  cnae: string | null; municipio: string | null; uf: string | null; capital_social: number | null; sem_dados: boolean;
  socios: { nome: string; qualificacao: string; entrada: string | number | null }[] | null;
}
interface Aresta { origem_tipo: string; origem_id: string; destino_tipo: string; destino_id: string; valor: number | null; n: number; rotulo_origem: string | null }

function formatarCnpj(c: string) {
  return c.length === 14 ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : c;
}

function montarRede(cnpj: string, nome: string, arestas: Aresta[]): TRede {
  const nos = new Map<string, NoRede>();
  const add = (id: string, tipo: NoRede["tipo"], rotulo: string, v: number) => {
    const n = nos.get(id);
    if (n) n.valor += v; else nos.set(id, { id, tipo, rotulo, valor: v });
  };
  add(`fornecedor:${cnpj}`, "fornecedor", nome, 0);
  for (const a of arestas) {
    add(`${a.origem_tipo}:${a.origem_id}`, a.origem_tipo as NoRede["tipo"], a.rotulo_origem ?? a.origem_id, a.valor ?? 0);
    add(`${a.destino_tipo}:${a.destino_id}`, a.destino_tipo as NoRede["tipo"], a.destino_id === cnpj ? nome : a.destino_id, a.valor ?? 0);
  }
  return { nos: [...nos.values()], arestas: arestas.map((a) => ({ origem: `${a.origem_tipo}:${a.origem_id}`, destino: `${a.destino_tipo}:${a.destino_id}`, valor: a.valor, n: a.n })) };
}

export function Fornecedor() {
  const cnpj = (useSearchParams()?.get("cnpj") ?? "").replace(/\D/g, "");
  const valido = cnpj.length === 14;
  const rec = useConsulta<Receita>(valido ? sqlFornecedor(cnpj) : null);
  const deps = useConsulta<{ deputado_id: number; nome: string; partido: string; uf: string; valor: number; n: number; primeiro: string | number | null; ultimo: string | number | null }>(
    valido ? sqlDeputadosDoFornecedor(cnpj) : null);
  const serie = useConsulta<{ periodo: string; valor: number }>(valido ? sqlSerieFornecedor(cnpj) : null);
  const rede = useConsulta<Aresta>(valido ? sqlRedeFornecedor(cnpj) : null);
  if (!valido) return <Titulo sub="Informe um CNPJ válido na URL (ex.: /fornecedor/?cnpj=00000000000000) ou abra um fornecedor a partir da página de gastos.">Fornecedor</Titulo>;
  if (rec.erro) return <Erro texto={rec.erro} />;
  const r = rec.dados?.[0];
  const nome = r?.razao_social ?? deps.dados?.[0]?.nome ?? formatarCnpj(cnpj);
  const total = deps.dados?.reduce((s, d) => s + d.valor, 0) ?? 0;
  const pontos = serie.dados ?? [];
  return (
    <>
      <Titulo sub={<>CNPJ {formatarCnpj(cnpj)}{r?.nome_fantasia ? ` · ${r.nome_fantasia}` : ""}</>}>{r?.razao_social ?? `Fornecedor ${formatarCnpj(cnpj)}`}</Titulo>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile rotulo="Recebido da cota" valor={deps.dados ? brlCurto(total) : "…"} />
        <StatTile rotulo="Deputados atendidos" valor={deps.dados ? num(deps.dados.length) : "…"} />
        <StatTile rotulo="Situação na Receita" valor={r ? (r.sem_dados ? "Sem dados" : r.situacao ?? "—") : "…"} />
        <StatTile rotulo="Aberta em" valor={r?.abertura ? data(r.abertura) : "—"} detalhe={r?.cnae ?? undefined} />
      </div>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <SerieTemporal titulo="Pagamentos mensais da cota" formato="brl" linhas={[{ nome: "Recebido", pontos, picos: detectarPicos(pontos) }]} />
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold">Dados da Receita Federal</h2>
            {!r ? <Carregando /> : r.sem_dados ? <p className="mt-2 text-sm text-muted">CNPJ não encontrado nas bases públicas consultadas.</p> : (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted">Município</dt><dd>{r.municipio ?? "—"}{r.uf ? `/${r.uf}` : ""}</dd>
                <dt className="text-muted">Atividade</dt><dd>{r.cnae ?? "—"}</dd>
                <dt className="text-muted">Capital social</dt><dd className="num">{r.capital_social !== null ? brl(r.capital_social) : "—"}</dd>
                <dt className="text-muted">Sócios</dt>
                <dd>{r.socios?.length ? <ul>{r.socios.map((s) => <li key={s.nome}>{s.nome} <span className="text-xs text-muted">· {s.qualificacao}{s.entrada ? ` desde ${data(s.entrada)}` : ""}</span></li>)}</ul> : "—"}</dd>
              </dl>
            )}
          </section>
        </div>
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-base font-semibold">Deputados que pagaram este fornecedor</h2>
          {!deps.dados ? <Carregando /> : (
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="sticky top-0 bg-card text-left text-muted"><tr><th className="py-2 pr-3 font-medium">Deputado</th><th className="py-2 pr-3 text-right font-medium">Notas</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor</th><th className="py-2 font-medium">Período</th></tr></thead>
                <tbody className="num">{deps.dados.map((d) => (
                  <tr key={d.deputado_id} className="border-t border-border">
                    <td className="py-2 pr-3"><Link href={`/deputado/${d.deputado_id}/`} className="text-destaque hover:underline">{d.nome}</Link> <span className="text-muted">({d.partido}-{d.uf})</span></td>
                    <td className="py-2 pr-3 text-right">{d.n}</td><td className="py-2 pr-3 text-right">{brl(d.valor)}</td>
                    <td className="py-2">{data(d.primeiro)} a {data(d.ultimo)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
        {rede.dados ? <Rede rede={montarRede(cnpj, nome, rede.dados)} centro={`fornecedor:${cnpj}`}
          subtitulo="Deputados que pagaram este fornecedor e sócios registrados na Receita." /> : null}
        <TabelaNotas filtros={{ cnpj }} />
      </div>
    </>
  );
}
