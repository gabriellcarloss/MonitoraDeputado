"use client";

import { AlertOctagon, Trophy } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { Foto } from "@/components/ui/Foto";
import { Contador } from "@/components/ui/Movimento";
import { Hemiciclo } from "./Hemiciclo";
import { brl, brlCurto, data, num, pct } from "@/lib/format";

export interface Pessoa {
  id: number;
  nome: string;
  partido: string;
  uf: string;
  foto: string | null;
}
export interface Destaque extends Pessoa {
  nota: number;
  presenca: number | null;
  projetos: number;
  gastoMensal: number;
}
export interface AlertaVitrine extends Pessoa {
  titulo: string;
  descricao: string;
}
export interface Kpi {
  rotulo: string;
  valor: number | null;
  formato: "brl" | "pct" | "num";
}

const FMT = { brl: brlCurto, pct: (v: number) => pct(v), num };
const MEDALHAS = ["ring-[#ffdf00]", "ring-white/80", "ring-[#d9a066]"];

function Pessoa({ p, tamanho = 44, anel }: { p: Pessoa; tamanho?: number; anel?: string }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full ring-[3px] ${anel ?? "ring-white/30"}`}>
      <Foto src={p.foto} nome={p.nome} tamanho={tamanho} sobreEscuro />
    </span>
  );
}

/** Faixa de alertas que desliza continuamente (para ao passar o mouse; estática com movimento reduzido). */
function FaixaAlertas({ itens }: { itens: AlertaVitrine[] }) {
  const reduzir = useReducedMotion();
  const cartao = (a: AlertaVitrine, k: string) => (
    <Link key={k} href={`/deputado/${a.id}/`} className="flex w-[320px] shrink-0 items-center gap-3 rounded-xl border border-white/15 bg-black/25 p-2.5 transition hover:bg-black/40">
      <Pessoa p={a} tamanho={38} anel="ring-[#d03b3b]" />
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-xs font-bold text-[#ffb4b4]"><AlertOctagon size={12} aria-hidden /> {a.titulo}</span>
        <span className="block truncate text-sm font-semibold">{a.nome} <span className="font-normal text-white/70">{a.partido}-{a.uf}</span></span>
        <span className="block truncate text-xs text-white/75">{a.descricao}</span>
      </span>
    </Link>
  );
  if (!itens.length) return null;
  if (reduzir) return <div className="flex gap-3 overflow-x-auto pb-1">{itens.map((a, i) => cartao(a, String(i)))}</div>;
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
      <motion.div className="flex w-max gap-3 group-hover:[animation-play-state:paused]"
        animate={{ x: ["0%", "-50%"] }} transition={{ duration: itens.length * 6, ease: "linear", repeat: Infinity }}>
        {[...itens, ...itens].map((a, i) => cartao(a, String(i)))}
      </motion.div>
    </div>
  );
}

/** Painel principal: números da legislatura, pódio do índice de desempenho, contraste de gastos e alertas em destaque. */
export function Hero({ geradoEm, kpis, podio, maior, menor, alertas, contagem }: {
  geradoEm: string; kpis: Kpi[]; podio: Destaque[]; maior?: Pessoa & { gastoMensal: number }; menor?: Pessoa & { gastoMensal: number };
  alertas: AlertaVitrine[]; contagem: { alta: number; atencao: number; info: number };
}) {
  const reduzir = useReducedMotion();
  const total = contagem.alta + contagem.atencao + contagem.info || 1;
  return (
    <div className="relative">
      <section className="hero-brasil relative overflow-hidden rounded-2xl p-5 text-white sm:p-8">
        <div className="hero-brilho pointer-events-none absolute inset-0" aria-hidden />
        <Hemiciclo className="hemiciclo pointer-events-none absolute -right-4 top-0 hidden aspect-[200/108] h-auto w-[30rem] max-w-[55%] sm:block" />
        <div className="relative space-y-6">
          <div>
            <p className="text-sm text-white/80">Legislatura 2023–2027 · dados até {data(geradoEm)}, atualizados todo dia</p>
            <h1 className="font-display mt-2 max-w-xl text-4xl leading-[1.02] sm:text-6xl">513 deputados, cada voto e cada real à vista</h1>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
            <div className="grid min-w-0 grid-cols-2 content-start gap-x-4 gap-y-6 self-start sm:grid-cols-3 xl:pt-4">
              {kpis.map((k) => (
                <div key={k.rotulo} className="min-w-0">
                  <p className="num-display whitespace-nowrap text-[1.6rem] leading-none sm:text-4xl">
                    {k.valor === null ? "—" : <Contador valor={k.valor} formato={FMT[k.formato]} />}
                  </p>
                  <p className="mt-1 text-xs font-medium text-white/80 sm:text-sm">{k.rotulo}</p>
                </div>
              ))}
            </div>

            <div className="min-w-0 rounded-xl bg-black/20 p-3 backdrop-blur-sm">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/85">
                <Trophy size={13} className="text-[#ffdf00]" aria-hidden /> Destaques do mandato · índice de desempenho
              </p>
              <ol className="grid gap-2 sm:grid-cols-3">
                {podio.map((p, i) => (
                  <li key={p.id}>
                    <Link href={`/deputado/${p.id}/`} className="flex h-full items-center gap-2.5 rounded-lg bg-white/5 p-2 transition hover:bg-white/10 sm:flex-col sm:text-center">
                      <span className="relative">
                        <Pessoa p={p} tamanho={52} anel={MEDALHAS[i]} />
                        <span className="num-display absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-[#ffdf00] text-xs text-[#0b1220]">{i + 1}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{p.nome}</span>
                        <span className="block text-xs text-white/70">{p.partido}-{p.uf}</span>
                        <span className="num-display block text-xl leading-tight text-[#ffdf00]">{p.nota}<span className="text-xs text-white/70">/100</span></span>
                        <span className="block text-[10px] leading-tight text-white/75">
                          {p.presenca === null ? "—" : pct(p.presenca, 0)} presença · {num(p.projetos)} projetos · {brlCurto(p.gastoMensal)}/mês
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              {maior && menor ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs">
                  <span className="text-white/70">Gasto mensal na cota:</span>
                  <Link href={`/deputado/${maior.id}/?aba=gastos`} className="flex items-center gap-1.5 hover:underline">
                    <Pessoa p={maior} tamanho={24} anel="ring-[#e34948]" /> maior <b>{maior.nome}</b> {brlCurto(maior.gastoMensal)}
                  </Link>
                  <Link href={`/deputado/${menor.id}/?aba=gastos`} className="flex items-center gap-1.5 hover:underline">
                    <Pessoa p={menor} tamanho={24} anel="ring-[#ffdf00]" /> menor <b>{menor.nome}</b> {brlCurto(menor.gastoMensal)}
                  </Link>
                  <span className="text-white/60">({brl(maior.gastoMensal - menor.gastoMensal)} de diferença por mês)</span>
                </div>
              ) : null}
              <p className="mt-1.5 text-[10px] text-white/60">Índice: média dos percentis de presença, participação em votações, projetos e relatorias por mês e uso da cota da UF (6+ meses de exercício). <Link href="/sobre/#indice" className="underline">Metodologia</Link></p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm">
                <span className="font-bold text-[#ffdf00]">{num(total)} pontos de atenção</span> — {num(contagem.alta)} alta, {num(contagem.atencao)} atenção, {num(contagem.info)} informativos.
              </p>
              <Link href="/alertas/?severidade=alta" className="text-sm underline underline-offset-2">Ver todos →</Link>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
              {([["alta", "#d03b3b"], ["atencao", "#fab219"], ["info", "#3987e5"]] as const).map(([k, cor], i) => (
                <motion.span key={k} style={{ background: cor }} className="h-full"
                  initial={reduzir ? false : { width: 0 }} animate={{ width: `${(contagem[k] / total) * 100}%` }}
                  transition={{ duration: 1.1, delay: 0.3 + i * 0.15, ease: [0.22, 1, 0.36, 1] }} />
              ))}
            </div>
            <FaixaAlertas itens={alertas} />
            <p className="text-[10px] text-white/60">Pontos de atenção são gerados automaticamente a partir de dados públicos. Não constituem acusação.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
