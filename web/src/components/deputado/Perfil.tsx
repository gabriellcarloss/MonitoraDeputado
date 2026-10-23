"use client";

import { AtSign, Building2, Globe, Mail } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Barras } from "@/components/charts/Barras";
import { Rede } from "@/components/charts/Rede";
import { SerieTemporal } from "@/components/charts/SerieTemporal";
import { BotaoFavorito } from "@/components/favoritos/BotaoFavorito";
import { TabelaNotas } from "@/components/gastos/TabelaNotas";
import { Foto } from "@/components/ui/Foto";
import { Carregando, Erro } from "@/components/ui/StatTile";
import { useConsulta } from "@/lib/duck";
import { brl, data, iso, num, pct } from "@/lib/format";
import { sqlPorCategoria, sqlPassagens } from "@/lib/queries/gastos";
import { sqlPresencaDeputado, sqlVotosDeputado } from "@/lib/queries/deputado";
import type { Brasil, DeputadoDetalhe, Serie } from "@/lib/types";
import { useJson } from "@/lib/useJson";
import { Abas, useAba } from "./Abas";
import { Boletim } from "./Boletim";
import { EmendasDeputado } from "./Emendas";
import { EquipeDeputado } from "./Equipe";
import { SeloAlerta } from "./SeloAlerta";

const ABAS = ["resumo", "gastos", "emendas", "equipe", "votacoes", "presenca", "proposicoes", "rede"] as const;
type Aba = (typeof ABAS)[number];
const ROTULOS: Record<Aba, string> = { resumo: "Resumo", gastos: "Gastos", emendas: "Emendas", equipe: "Equipe", votacoes: "Votações",
  presenca: "Presença", proposicoes: "Proposições", rede: "Rede" };

function serie(series: Serie[], m: string) {
  return series.find((s) => s.metrica === m);
}

/** Média por deputado de uma série agregada (soma do grupo ÷ nº de deputados do grupo). */
function mediaPorDeputado(s: Serie | undefined, n: number) {
  return s && n ? s.pontos.map((p) => ({ periodo: p.periodo, valor: p.valor / n })) : [];
}

function Cabecalho({ d }: { d: DeputadoDetalhe }) {
  const p = d.deputado;
  return (
    <header className="mb-4 flex flex-wrap items-start gap-4">
      <Foto src={p.foto} nome={p.nome} tamanho={88} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{p.nome}</h1>
          <BotaoFavorito id={p.id} nome={p.nome} rotulo />
        </div>
        <p className="text-muted">
          {p.partido_atual}-{p.uf} · {p.condicao_eleitoral ?? "—"} · {p.em_exercicio ? "em exercício" : "fora do exercício"}
          {p.trocou_partido ? " · trocou de partido no mandato" : ""}
        </p>
        <p className="mt-1 text-sm text-muted">
          {p.nome_civil ? <>Nome civil: {p.nome_civil} · </> : null}
          Em exercício desde {data(p.inicio_exercicio)}{p.fim_exercicio ? ` até ${data(p.fim_exercicio)}` : ""}
          {p.escolaridade ? ` · ${p.escolaridade}` : ""}
        </p>
        <ul className="mt-2 flex flex-wrap gap-3 text-sm">
          {p.email ? <li><a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 text-destaque"><Mail size={14} aria-hidden />{p.email}</a></li> : null}
          {p.gabinete?.sala ? <li className="inline-flex items-center gap-1 text-muted"><Building2 size={14} aria-hidden />Gabinete {p.gabinete.sala}, anexo {p.gabinete.predio}{p.gabinete.telefone ? ` · (61) ${p.gabinete.telefone}` : ""}</li> : null}
          {(p.redes ?? []).map((r) => (
            <li key={r}><a href={r} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-destaque">
              {r.includes("instagram") || r.includes("twitter") || r.includes("x.com") ? <AtSign size={14} aria-hidden /> : <Globe size={14} aria-hidden />}
              {r.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}</a></li>
          ))}
        </ul>
      </div>
    </header>
  );
}

function Resumo({ d, total }: { d: DeputadoDetalhe; total: number }) {
  return (
    <div className="space-y-6">
      {d.alertas.length ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Pontos de atenção ({d.alertas.length})</h2>
          <div className="grid gap-3 lg:grid-cols-2">{d.alertas.map((a) => <SeloAlerta key={a.id} alerta={a} />)}</div>
        </section>
      ) : <p className="rounded-lg border border-border bg-card p-3 text-sm text-muted">Nenhum ponto de atenção gerado pelas regras automáticas.</p>}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Boletim de desempenho</h2>
        <Boletim indicadores={d.indicadores} posicoes={d.posicoes} total={total} />
      </section>
    </div>
  );
}

function Gastos({ d }: { d: DeputadoDetalhe }) {
  const id = d.deputado.id;
  const brasil = useJson<Brasil>("/data/brasil.json");
  const cats = useConsulta<{ categoria: string; valor: number }>(sqlPorCategoria({ deputado: id }));
  const pass = useConsulta<{ trecho: string; n: number; valor: number; terceiros: number }>(sqlPassagens({ deputado: id }));
  const g = serie(d.series, "gasto");
  const b = brasil.dados;
  const linhas = [{ nome: d.deputado.nome, pontos: g?.pontos ?? [], picos: g?.picos }];
  if (b) {
    const nP = b.agregados.partido[d.deputado.partido_atual]?.n ?? 0;
    const nB = b.agregados.brasil.n;
    linhas.push({ nome: `Média ${d.deputado.partido_atual}`, pontos: mediaPorDeputado(serie(b.series_partido[d.deputado.partido_atual] ?? [], "gasto"), nP), picos: undefined });
    linhas.push({ nome: "Média Brasil", pontos: mediaPorDeputado(serie(b.series, "gasto"), nB), picos: undefined });
  }
  return (
    <div className="space-y-6">
      <SerieTemporal titulo="Gasto mensal da cota" formato="brl" linhas={linhas}
        subtitulo="Linha principal com picos marcados (!); médias por deputado do partido e do Brasil para comparação." />
      <div className="grid gap-6 lg:grid-cols-2">
        {cats.erro ? <Erro texto={cats.erro} /> : !cats.dados ? <Carregando /> : (
          <Barras titulo="Gasto por categoria" itens={cats.dados.map((c) => ({ rotulo: c.categoria, valor: c.valor,
            href: `/gastos/?deputado=${id}&categoria=${encodeURIComponent(c.categoria)}` }))} />
        )}
        <Barras titulo="Principais fornecedores" cor={1} itens={d.top_fornecedores.map((f) => ({ rotulo: f.nome, valor: f.valor,
          detalhe: `${f.n} notas`, href: f.cnpj && f.cnpj.length === 14 ? `/fornecedor/?cnpj=${f.cnpj}` : undefined }))} />
      </div>
      {pass.dados && pass.dados.length ? (
        <section className="cartao p-4">
          <h2 className="font-display text-xl leading-none">Passagens aéreas por trecho</h2>
          <p className="mb-2 text-sm text-muted">
            {num(pass.dados.reduce((s, p) => s + p.terceiros, 0))} de {num(pass.dados.reduce((s, p) => s + p.n, 0))} passagens emitidas para outras pessoas.{" "}
            <Link href={`/gastos/passagens/?deputado=${id}`} className="text-destaque underline">Ver passageiros</Link>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm num">
              <thead className="text-left text-muted"><tr><th className="py-1 pr-3 font-medium">Trecho</th><th className="py-1 pr-3 text-right font-medium">Passagens</th><th className="py-1 pr-3 text-right font-medium">Para terceiros</th><th className="py-1 text-right font-medium">Valor</th></tr></thead>
              <tbody>{pass.dados.map((p) => (
                <tr key={p.trecho ?? "?"} className="border-t border-border"><td className="py-1 pr-3">{p.trecho ?? "—"}</td><td className="py-1 pr-3 text-right">{p.n}</td><td className="py-1 pr-3 text-right">{p.terceiros || "—"}</td><td className="py-1 text-right">{brl(p.valor)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}
      <TabelaNotas filtros={{ deputado: id }} mostrarDeputado={false} />
    </div>
  );
}

interface Voto { votacao_id: string; data: string; sigla_orgao: string; descricao: string; voto: string;
  orientacao_partido: string | null; orientacao_governo: string | null; seguiu_partido: boolean | null; seguiu_governo: boolean | null }

function Votacoes({ d }: { d: DeputadoDetalhe }) {
  const votos = useConsulta<Voto>(sqlVotosDeputado(d.deputado.id, 300));
  const s = serie(d.series, "votacoes");
  const i = d.indicadores;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi rotulo="Participação em votações" valor={i?.pct_participacao_votacoes == null ? "—" : pct(i.pct_participacao_votacoes)} />
        <Kpi rotulo="Alinhamento ao partido" valor={i?.pct_alinhamento_partido == null ? "—" : pct(i.pct_alinhamento_partido)} />
        <Kpi rotulo="Alinhamento ao governo" valor={i?.pct_alinhamento_governo == null ? "—" : pct(i.pct_alinhamento_governo)} />
        <Kpi rotulo="Votos contra o partido" valor={num(i?.n_votos_contra_bancada ?? 0)} />
      </div>
      <SerieTemporal titulo="Votos registrados por mês" barras formato="num" linhas={[{ nome: "Votos", pontos: s?.pontos ?? [], picos: s?.picos }]} altura={220} />
      <section className="cartao p-4">
        <h2 className="font-display mb-3 text-xl leading-none">Como votou (últimas 300 votações)</h2>
        {votos.erro ? <Erro texto={votos.erro} /> : !votos.dados ? <Carregando /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-muted"><tr>
                <th className="py-2 pr-3 font-medium">Data</th><th className="py-2 pr-3 font-medium">Votação</th><th className="py-2 pr-3 font-medium">Voto</th>
                <th className="py-2 pr-3 font-medium">Partido orientou</th><th className="py-2 font-medium">Governo orientou</th>
              </tr></thead>
              <tbody>{votos.dados.map((v) => (
                <tr key={v.votacao_id} className="border-t border-border align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{data(v.data)}</td>
                  <td className="py-2 pr-3"><Link href={`/votacao/?id=${encodeURIComponent(v.votacao_id)}`} className="hover:underline">{v.descricao}</Link><span className="block text-xs text-muted">{v.sigla_orgao}</span></td>
                  <td className="py-2 pr-3 font-semibold">{v.voto}</td>
                  <td className="py-2 pr-3">{v.orientacao_partido ?? "—"}{v.seguiu_partido === false ? <span className="ml-1 rounded border border-atencao/60 bg-atencao/15 px-1 text-[10px] font-semibold uppercase">contra</span> : null}</td>
                  <td className="py-2">{v.orientacao_governo ?? "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({ rotulo, valor }: { rotulo: string; valor: string }) {
  return <div className="cartao p-3"><p className="text-xs text-muted">{rotulo}</p><p className="num text-xl font-bold">{valor}</p></div>;
}

interface RegPresenca { id: number; data: string; presente: boolean; justificada: boolean; justificativa: string | null }

function Presenca({ d }: { d: DeputadoDetalhe }) {
  const r = useConsulta<RegPresenca>(sqlPresencaDeputado(d.deputado.id));
  const s = serie(d.series, "presenca");
  const i = d.indicadores;
  const meses = new Map<string, RegPresenca[]>();
  for (const x of r.dados ?? []) {
    const m = (iso(x.data) ?? "").slice(0, 7);
    meses.set(m, [...(meses.get(m) ?? []), x]);
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi rotulo="Presença em sessões" valor={i?.pct_presenca_sessoes == null ? "—" : pct(i.pct_presenca_sessoes)} />
        <Kpi rotulo="Faltas sem justificativa" valor={i?.n_faltas_sem_justificativa == null ? "—" : num(i.n_faltas_sem_justificativa)} />
        <Kpi rotulo="Ausências justificadas" valor={num(i?.n_faltas_justificadas ?? 0)} />
        <Kpi rotulo="Participação em votações" valor={i?.pct_participacao_votacoes == null ? "—" : pct(i.pct_participacao_votacoes)} />
      </div>
      <SerieTemporal titulo="Presença mensal em sessões deliberativas" formato="pct" linhas={[{ nome: "Presença", pontos: s?.pontos ?? [] }]} altura={220}
        subtitulo="Ausências com justificativa oficial (licença médica, missão autorizada) ficam fora da conta." />
      <section className="cartao p-4">
        <h2 className="font-display text-xl leading-none">Calendário de sessões</h2>
        <p className="mb-3 flex flex-wrap gap-4 text-sm text-muted">
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-verde" aria-hidden /> Presente</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-info" aria-hidden /> Ausência justificada</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-alta" aria-hidden /> Falta sem justificativa</span>
        </p>
        {r.erro ? <Erro texto={r.erro} /> : !r.dados ? <Carregando /> : r.dados.length === 0 ? <p className="text-sm text-muted">Sem sessões no período de exercício.</p> : (
          <div className="space-y-2">
            {[...meses.entries()].reverse().map(([m, xs]) => {
              const pres = xs.filter((x) => x.presente).length;
              const contadas = xs.filter((x) => x.presente || !x.justificada).length;
              return (
                <div key={m} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="w-20 text-muted">{m.slice(5)}/{m.slice(0, 4)}</span>
                  <div className="flex flex-wrap gap-1">
                    {xs.map((x) => (
                      <span key={`${x.id}`}
                        title={`${data(x.data)}: ${x.presente ? "presente" : x.justificada ? `ausência justificada${x.justificativa ? ` (${x.justificativa})` : ""}` : "falta sem justificativa"}`}
                        className={`h-4 w-4 rounded-sm ${x.presente ? "bg-verde" : x.justificada ? "bg-info" : "bg-alta"}`} />
                    ))}
                  </div>
                  <span className="num text-muted">{pres}/{contadas}{contadas < xs.length ? ` · ${xs.length - contadas} just.` : ""}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Proposicoes({ d }: { d: DeputadoDetalhe }) {
  const s = serie(d.series, "proposicoes");
  const relevantes = d.proposicoes.filter((p) => p.relevante);
  const outras = d.proposicoes.filter((p) => !p.relevante);
  const Lista = ({ itens }: { itens: typeof d.proposicoes }) => (
    <ul className="divide-y divide-border">
      {itens.slice(0, 200).map((p) => (
        <li key={`${p.id}-${p.principal}`} className="py-2 text-sm">
          <p className="font-medium">{p.sigla_tipo} {p.numero}/{p.ano}
            <span className="ml-2 rounded border border-border px-1 text-xs font-normal text-muted">{p.principal ? "autor" : "coautor"}</span>
            {p.situacao ? <span className="ml-2 text-xs font-normal text-muted">{p.situacao}</span> : null}</p>
          <p className="text-muted">{p.ementa}</p>
          {p.url_inteiro_teor ? <a href={p.url_inteiro_teor} target="_blank" rel="noopener noreferrer" className="text-xs text-destaque underline">Inteiro teor</a> : null}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="space-y-6">
      <SerieTemporal titulo="Projetos apresentados por mês (autor)" barras formato="num" linhas={[{ nome: "Projetos", pontos: s?.pontos ?? [], picos: s?.picos }]} altura={220} />
      <section className="cartao p-4">
        <h2 className="font-display text-xl leading-none">Projetos de lei e emendas constitucionais ({relevantes.length})</h2>
        {relevantes.length ? <Lista itens={relevantes} /> : <p className="py-4 text-sm text-muted">Nenhum PL, PLP, PEC ou PDL no período.</p>}
      </section>
      <section className="cartao p-4">
        <h2 className="font-display text-xl leading-none">Requerimentos, indicações e outros ({outras.length})</h2>
        <p className="text-sm text-muted">Atividade administrativa — contada à parte dos projetos.</p>
        {outras.length ? <Lista itens={outras} /> : <p className="py-4 text-sm text-muted">Nenhum registro.</p>}
      </section>
    </div>
  );
}

function Conteudo({ d, total, aba, onChange }: { d: DeputadoDetalhe; total: number; aba: Aba; onChange: (a: Aba) => void }) {
  return (
    <>
      <Abas abas={ABAS} rotulos={ROTULOS} atual={aba} onChange={onChange} />
      {aba === "resumo" ? <Resumo d={d} total={total} /> : null}
      {aba === "gastos" ? <Gastos d={d} /> : null}
      {aba === "emendas" ? <EmendasDeputado d={d} /> : null}
      {aba === "equipe" ? <EquipeDeputado d={d} /> : null}
      {aba === "votacoes" ? <Votacoes d={d} /> : null}
      {aba === "presenca" ? <Presenca d={d} /> : null}
      {aba === "proposicoes" ? <Proposicoes d={d} /> : null}
      {aba === "rede" ? <Rede rede={d.rede} centro={`deputado:${d.deputado.id}`} subtitulo="Fornecedores e passageiros ligados a este deputado e outros deputados que usam os mesmos." /> : null}
    </>
  );
}

function ComAbas({ d, total }: { d: DeputadoDetalhe; total: number }) {
  const [aba, setAba] = useAba(ABAS);
  return <Conteudo d={d} total={total} aba={aba} onChange={setAba} />;
}

/**
 * Perfil do deputado. Cabeçalho e Resumo saem prontos no HTML estático (para buscadores e prévias de link);
 * só a troca de aba depende da URL (?aba=), por isso só ela fica dentro do Suspense.
 */
export function Perfil({ d, total }: { d: DeputadoDetalhe; total: number }) {
  return (
    <>
      <Cabecalho d={d} />
      <Suspense fallback={<Conteudo d={d} total={total} aba="resumo" onChange={() => {}} />}>
        <ComAbas d={d} total={total} />
      </Suspense>
    </>
  );
}
