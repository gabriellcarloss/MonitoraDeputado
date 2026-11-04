"use client";

/* eslint-disable @next/next/no-img-element */
import type { EChartsOption } from "echarts";
import {
  AtSign, Building2, CalendarCheck, CalendarDays, FileText, Flag, GraduationCap, Globe, Landmark, Mail, ShieldAlert, ShieldCheck,
  TrendingDown, TrendingUp, Vote, Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { EChart } from "@/components/charts/EChart";
import { ANIMACAO, comAlfa, tooltipBase, useCores } from "@/components/charts/cores";
import { Compartilhar } from "@/components/coleta/Compartilhar";
import { BotaoFavorito } from "@/components/favoritos/BotaoFavorito";
import { brlCurto, data, num } from "@/lib/format";
import { INDICADORES } from "@/lib/indicadores";
import { resumoDeputado } from "@/lib/resumo";
import type { DeputadoDetalhe, NomeIndicador } from "@/lib/types";

/** Nota de 0 a 100: quanto do ranking nacional o deputado deixou para trás (100 = 1º lugar). */
function nota(d: DeputadoDetalhe, k: NomeIndicador, total: number): number | null {
  const pos = d.posicoes[k];
  const t = pos?.total ?? total;
  if (!pos || t < 2) return null;
  return Math.round((1 - (pos.brasil - 1) / (t - 1)) * 100);
}

function rede(url: string) {
  const host = url.replace(/^https?:\/\/(www\.)?/, "");
  const Icone = /twitter|x\.com|instagram|threads|tiktok|youtube|facebook/.test(host) ? AtSign : Globe;
  return { host: host.replace(/\/$/, "").slice(0, 34), Icone };
}

function Vidro({ icone, rotulo, valor, detalhe, tom = "", i }: { icone: ReactNode; rotulo: string; valor: string; detalhe?: string | null; tom?: string; i: number }) {
  return (
    <div className="subir group rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/15" style={{ ["--i" as string]: i + 4 }} data-tilt="6">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/70">
        <span className={`grid h-7 w-7 place-items-center rounded-lg bg-white/15 ${tom}`}>{icone}</span>{rotulo}
      </div>
      <p className="num-display mt-1.5 text-3xl leading-none text-white">{valor}</p>
      {detalhe ? <p className="mt-1 text-xs text-white/65">{detalhe}</p> : null}
    </div>
  );
}

/** Cartão principal do deputado: foto grande, identificação, contatos, ações e os números que mais importam. */
export function SuperCard({ d, total }: { d: DeputadoDetalhe; total: number }) {
  const p = d.deputado;
  const i = d.indicadores;
  const pos = d.posicoes;
  const rank = (k: NomeIndicador) => (pos[k] ? `${pos[k]!.brasil}º de ${pos[k]!.total ?? total} no Brasil` : null);
  const mandato = `Em exercício desde ${data(p.inicio_exercicio)}${p.fim_exercicio ? ` até ${data(p.fim_exercicio)}` : ""}`;
  return (
    <header className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#06281c] via-[#0b5a3d] to-[#1a3f8a] text-white shadow-[0_30px_70px_-30px_rgb(0_39_118/0.6)]">
      <span aria-hidden className="faixa-bandeira-h absolute inset-x-0 top-0 block h-1.5" />
      {/* fundo: luzes e anéis girando */}
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgb(255_223_0/0.28),transparent_65%)]" />
      <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgb(52_168_113/0.35),transparent_65%)]" />
      <span aria-hidden className="girar pointer-events-none absolute -right-16 top-6 h-72 w-72 rounded-full border border-dashed border-white/15" />
      <span aria-hidden className="girar-rev pointer-events-none absolute right-6 top-16 h-48 w-48 rounded-full border border-white/10" />
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative flex flex-col gap-6 p-5 pt-7 sm:p-7 sm:pt-8 lg:flex-row lg:items-center">
        <div className="mx-auto shrink-0 lg:mx-0" style={{ perspective: 900 }}>
          <div className="relative orbita-3d">
            <span aria-hidden className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-[#ffdf00]/60 via-transparent to-[#34a871]/50 blur-xl" />
            {p.foto ? (
              <img src={p.foto} alt={`Foto de ${p.nome}`} width={192} height={192}
                className="relative h-44 w-44 rounded-[1.75rem] border-4 border-[#ffdf00] bg-[#0b3b2a] object-cover shadow-[0_24px_50px_-18px_rgb(0_0_0/0.7)] sm:h-52 sm:w-52" />
            ) : (
              <span className="num-display relative grid h-44 w-44 place-items-center rounded-[1.75rem] border-4 border-[#ffdf00] bg-[#0b3b2a] text-6xl sm:h-52 sm:w-52">
                {p.nome.split(" ").slice(0, 2).map((x) => x[0]).join("")}
              </span>
            )}
            <span className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#ffdf00] px-3.5 py-1 text-sm font-extrabold text-[#102018] shadow-lg">
              <Flag size={14} aria-hidden /> {p.partido_atual} · {p.uf}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center lg:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${p.em_exercicio ? "pulso-vivo bg-emerald-400" : "bg-white/50"}`} aria-hidden />
              {p.em_exercicio ? "Em exercício" : "Fora do exercício"}
            </span>
            {p.condicao_eleitoral ? <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">{p.condicao_eleitoral}</span> : null}
            {p.trocou_partido ? <span className="rounded-full bg-[#ffdf00]/90 px-3 py-1 text-xs font-bold text-[#102018]">Trocou de partido no mandato</span> : null}
          </div>
          <h1 className="font-display subir mt-3 text-5xl leading-[0.95] tracking-tight drop-shadow-[0_4px_18px_rgb(0_0_0/0.35)] sm:text-6xl">{p.nome}</h1>
          <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-sm text-white/80 lg:justify-start">
            {p.nome_civil ? <li className="inline-flex items-center gap-1.5"><Landmark size={14} aria-hidden /> {p.nome_civil}</li> : null}
            <li className="inline-flex items-center gap-1.5"><CalendarDays size={14} aria-hidden /> {mandato}</li>
            {p.escolaridade ? <li className="inline-flex items-center gap-1.5"><GraduationCap size={14} aria-hidden /> {p.escolaridade}</li> : null}
            {p.gabinete?.sala ? (
              <li className="inline-flex items-center gap-1.5"><Building2 size={14} aria-hidden /> Gabinete {p.gabinete.sala}, anexo {p.gabinete.predio}{p.gabinete.telefone ? ` · (61) ${p.gabinete.telefone}` : ""}</li>
            ) : null}
          </ul>
          <ul className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">
            {p.email ? (
              <li><a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold transition hover:bg-white/20"><Mail size={13} aria-hidden /> {p.email}</a></li>
            ) : null}
            {(p.redes ?? []).map((r) => {
              const { host, Icone } = rede(r);
              return (
                <li key={r}><a href={r} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold transition hover:bg-white/20"><Icone size={13} aria-hidden /> {host}</a></li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <BotaoFavorito id={p.id} nome={p.nome} rotulo />
            <Compartilhar texto={resumoDeputado(d)} caminho={`/deputado/${p.id}/`} />
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-3 border-t border-white/10 bg-black/15 p-4 sm:p-5 md:grid-cols-3 xl:grid-cols-6">
        <Vidro i={0} icone={<Wallet size={15} aria-hidden />} rotulo="Cota por mês" valor={i && i.gasto_medio_mensal > 0 ? brlCurto(i.gasto_medio_mensal) : "—"} detalhe={rank("gasto_medio_mensal")} />
        <Vidro i={1} icone={<CalendarCheck size={15} aria-hidden />} rotulo="Presença" valor={INDICADORES.pct_presenca_sessoes.formato(i?.pct_presenca_sessoes)} detalhe={rank("pct_presenca_sessoes")} tom="text-emerald-300" />
        <Vidro i={2} icone={<Vote size={15} aria-hidden />} rotulo="Votações" valor={INDICADORES.pct_participacao_votacoes.formato(i?.pct_participacao_votacoes)} detalhe="participação" tom="text-sky-300" />
        <Vidro i={3} icone={<FileText size={15} aria-hidden />} rotulo="Projetos" valor={i ? num(i.n_proposicoes_relevantes) : "—"} detalhe={i ? `${num(i.n_aprovadas)} viraram lei` : null} tom="text-amber-300" />
        <Vidro i={4} icone={<Landmark size={15} aria-hidden />} rotulo="Emendas" valor={d.emendas?.empenhado ? brlCurto(d.emendas.empenhado) : "—"} detalhe="empenhado" tom="text-violet-300" />
        <Vidro i={5} icone={d.alertas.length ? <ShieldAlert size={15} aria-hidden /> : <ShieldCheck size={15} aria-hidden />} rotulo="Pontos de atenção" valor={num(d.alertas.length)}
          detalhe={d.alertas.length ? `${d.alertas.filter((a) => a.severidade === "alta").length} de severidade alta` : "nenhum"} tom={d.alertas.length ? "text-rose-300" : "text-emerald-300"} />
      </div>
    </header>
  );
}

const DIMENSOES: { rotulo: string; k: NomeIndicador }[] = [
  { rotulo: "Economia da cota", k: "gasto_medio_mensal" },
  { rotulo: "Presença", k: "pct_presenca_sessoes" },
  { rotulo: "Votações", k: "pct_participacao_votacoes" },
  { rotulo: "Projetos", k: "n_proposicoes_relevantes" },
  { rotulo: "Custo por projeto", k: "custo_por_proposicao" },
  { rotulo: "Fidelidade ao partido", k: "pct_alinhamento_partido" },
];

/** Radar com a posição no ranking nacional em seis frentes e leitura rápida de pontos fortes e de atenção. */
export function Analise({ d, total }: { d: DeputadoDetalhe; total: number }) {
  const c = useCores();
  const dims = DIMENSOES.map((x) => ({ ...x, nota: nota(d, x.k, total) })).filter((x): x is typeof x & { nota: number } => x.nota !== null);
  if (dims.length < 3) return null;
  const todos = (Object.keys(d.posicoes) as NomeIndicador[]).map((k) => ({ k, n: nota(d, k, total) }))
    .filter((x): x is { k: NomeIndicador; n: number } => x.n !== null && !["n_faltas_justificadas", "n_proposicoes_coautor", "n_requerimentos", "n_relatorias"].includes(x.k));
  const fortes = [...todos].sort((a, b) => b.n - a.n).filter((x) => x.n >= 75).slice(0, 4);
  const atencao = [...todos].sort((a, b) => a.n - b.n).filter((x) => x.n <= 25).slice(0, 4);
  const option: EChartsOption = {
    ...ANIMACAO,
    tooltip: { ...tooltipBase(c), formatter: () => dims.map((x) => `${x.rotulo}: <b>${x.nota}</b>`).join("<br/>") },
    radar: {
      indicator: dims.map((x) => ({ name: x.rotulo, max: 100 })), radius: "66%", splitNumber: 4,
      axisName: { color: c.texto, fontSize: 12, fontWeight: 600 },
      splitLine: { lineStyle: { color: c.grade } }, splitArea: { areaStyle: { color: [comAlfa(c.series[0], 0.03), comAlfa(c.series[0], 0.07)] } },
      axisLine: { lineStyle: { color: c.grade } },
    },
    series: [{
      type: "radar", symbolSize: 7, lineStyle: { width: 3, color: c.series[0] }, itemStyle: { color: c.series[0] },
      areaStyle: { color: comAlfa(c.series[0], 0.32) }, data: [{ value: dims.map((x) => x.nota), name: d.deputado.nome }],
    }],
  };
  const Chip = ({ k, n, bom }: { k: NomeIndicador; n: number; bom: boolean }) => (
    <li className={`flex items-center gap-3 rounded-xl border p-2.5 ${bom ? "border-verde/30 bg-verde/10" : "border-alta/30 bg-alta/10"}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${bom ? "bg-verde text-white" : "bg-alta text-white"}`}>
        {bom ? <TrendingUp size={18} aria-hidden /> : <TrendingDown size={18} aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">{INDICADORES[k].rotulo}</span>
        <span className="block text-xs text-muted">{INDICADORES[k].formato(d.indicadores?.[k])} · {bom ? `à frente de ${n}% dos deputados` : `atrás de ${100 - n}% dos deputados`}</span>
      </span>
    </li>
  );
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <div className="cartao p-4" data-revelar>
        <h2 className="font-display text-xl leading-none">Perfil de desempenho</h2>
        <p className="mb-1 text-sm text-muted">Posição entre os deputados do Brasil em seis frentes: quanto mais para fora, melhor (100 = 1º lugar).</p>
        <EChart option={option} altura={310} />
      </div>
      <div className="cartao space-y-4 p-4" data-revelar>
        <div>
          <h2 className="font-display text-xl leading-none">Leitura rápida</h2>
          <p className="text-sm text-muted">O que mais se destaca nos números oficiais, comparado aos demais deputados.</p>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-destaque">Pontos fortes</h3>
          {fortes.length ? <ul className="grid gap-2 sm:grid-cols-2">{fortes.map((x) => <Chip key={x.k} k={x.k} n={x.n} bom />)}</ul>
            : <p className="text-sm text-muted">Nenhum indicador entre os 25% melhores.</p>}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-alta">Pontos de atenção nos números</h3>
          {atencao.length ? <ul className="grid gap-2 sm:grid-cols-2">{atencao.map((x) => <Chip key={x.k} k={x.k} n={x.n} bom={false} />)}</ul>
            : <p className="text-sm text-muted">Nenhum indicador entre os 25% piores.</p>}
        </div>
        <p className="text-xs text-muted">Comparação estatística com base em dados públicos; não constitui acusação.</p>
      </div>
    </section>
  );
}
