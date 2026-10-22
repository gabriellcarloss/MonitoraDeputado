"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { Foto } from "@/components/ui/Foto";
import { Contador, Inclinavel } from "@/components/ui/Movimento";
import { brl, brlCurto, data, num, pct } from "@/lib/format";

export interface Lado {
  id: number;
  nome: string;
  partido: string;
  uf: string;
  foto: string | null;
  valor: number;
}

/** Painel principal: totais da legislatura e o contraste entre quem mais e quem menos gastou. */
export function Hero({ geradoEm, gastoTotal, media, presenca, maior, menor, alertas }: {
  geradoEm: string; gastoTotal: number; media: number; presenca: number | null; maior?: Lado; menor?: Lado;
  alertas: { alta: number; atencao: number; info: number };
}) {
  const reduzir = useReducedMotion();
  const totalAlertas = alertas.alta + alertas.atencao + alertas.info || 1;
  const fator = maior && menor && menor.valor > 0 ? maior.valor / menor.valor : null;
  return (
    <Inclinavel max={2.5} className="relative">
      <section className="hero-brasil relative overflow-hidden rounded-2xl p-5 text-white shadow-2xl sm:p-7">
        <div className="hero-brilho pointer-events-none absolute inset-0" aria-hidden />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rotate-12 rounded-[3rem] bg-white/5" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
            <span className="rounded-full bg-[#ffdf00] px-2.5 py-1 text-[#0b1220]">Atualização diária</span>
            <span className="rounded-full border border-white/40 px-2.5 py-1">Legislatura 2023–2027</span>
            <span className="font-medium normal-case tracking-normal text-white/80">dados até {data(geradoEm)}</span>
          </div>
          <h1 className="font-display mt-3 text-4xl leading-none sm:text-5xl">Câmara · <span className="text-[#ffdf00]">Deputados federais</span></h1>

          <div className="mt-5 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              <div>
                <p className="num-display whitespace-nowrap text-[1.6rem] leading-none sm:text-4xl 2xl:text-5xl"><Contador valor={gastoTotal} formato={brlCurto} /></p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/75 sm:text-xs">Gasto da cota</p>
              </div>
              <div>
                <p className="num-display whitespace-nowrap text-[1.6rem] leading-none sm:text-4xl 2xl:text-5xl"><Contador valor={media} formato={brlCurto} /></p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/75 sm:text-xs">Média por deputado</p>
              </div>
              <div>
                <p className="num-display whitespace-nowrap text-[1.6rem] leading-none sm:text-4xl 2xl:text-5xl">{presenca === null ? "—" : <Contador valor={presenca} formato={(v) => pct(v)} />}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/75 sm:text-xs">Presença média</p>
              </div>
            </div>

            {maior && menor ? (
              <div className="min-w-0 rounded-xl bg-black/20 p-3 backdrop-blur-sm">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/70">Quem mais × quem menos gastou</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/deputado/${maior.id}/?aba=gastos`} className="flex min-w-0 items-center gap-3 hover:opacity-90">
                    <span className="rounded-full ring-4 ring-[#e34948]"><Foto src={maior.foto} nome={maior.nome} tamanho={56} /></span>
                    <span className="min-w-0">
                      <span className="num-display block text-2xl leading-none">{brlCurto(maior.valor)}</span>
                      <span className="block truncate text-sm font-bold uppercase">{maior.nome}</span>
                      <span className="block text-xs text-white/70">{maior.partido}-{maior.uf}</span>
                    </span>
                  </Link>
                  <Link href={`/deputado/${menor.id}/?aba=gastos`} className="flex min-w-0 items-center gap-3 hover:opacity-90 sm:flex-row-reverse sm:text-right">
                    <span className="rounded-full ring-4 ring-[#ffdf00]"><Foto src={menor.foto} nome={menor.nome} tamanho={56} /></span>
                    <span className="min-w-0">
                      <span className="num-display block text-2xl leading-none">{brlCurto(menor.valor)}</span>
                      <span className="block truncate text-sm font-bold uppercase">{menor.nome}</span>
                      <span className="block text-xs text-white/70">{menor.partido}-{menor.uf}</span>
                    </span>
                  </Link>
                </div>
                {fator ? (
                  <p className="mt-3 rounded-lg border border-white/15 bg-white/5 py-1.5 text-center text-xs">
                    diferença <span className="num-display mx-1 text-xl text-[#ffdf00]">{fator.toFixed(1).replace(".", ",")}×</span>
                    {brl(maior.valor - menor.valor)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
              {([["alta", "#d03b3b"], ["atencao", "#fab219"], ["info", "#3987e5"]] as const).map(([k, cor], i) => (
                <motion.span key={k} style={{ background: cor }} className="h-full"
                  initial={reduzir ? false : { width: 0 }} animate={{ width: `${(alertas[k] / totalAlertas) * 100}%` }}
                  transition={{ duration: 1.1, delay: 0.3 + i * 0.15, ease: [0.22, 1, 0.36, 1] }} />
              ))}
            </div>
            <p className="mt-2 text-sm">
              <span className="font-bold text-[#ffdf00]">{num(alertas.alta + alertas.atencao + alertas.info)} pontos de atenção</span> gerados automaticamente:{" "}
              {num(alertas.alta)} de severidade alta, {num(alertas.atencao)} de atenção e {num(alertas.info)} informativos.{" "}
              <Link href="/alertas/" className="underline underline-offset-2">Ver alertas →</Link>
            </p>
          </div>
        </div>
      </section>
    </Inclinavel>
  );
}
