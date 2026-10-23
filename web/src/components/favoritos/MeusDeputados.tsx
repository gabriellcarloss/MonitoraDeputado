"use client";

import { AlertTriangle, Star } from "lucide-react";
import Link from "next/link";
import { Foto } from "@/components/ui/Foto";
import { useFavoritos } from "@/lib/favoritos";
import { brl, brlCurto, num, ouTraco, pct } from "@/lib/format";
import type { DeputadoResumo } from "@/lib/types";
import { useJson } from "@/lib/useJson";
import { BotaoFavorito } from "./BotaoFavorito";

/** Painel "Meus deputados" da página inicial: quem a pessoa marcou com ★ (guardado só no navegador dela). */
export function MeusDeputados() {
  const { ids, pronto } = useFavoritos();
  const { dados } = useJson<DeputadoResumo[]>(ids.length ? "/data/deputados.json" : null);
  if (!pronto) return null;
  const meus = ids.map((id) => dados?.find((d) => d.id === id)).filter((d): d is DeputadoResumo => !!d);

  return (
    <section aria-labelledby="meus-deputados" className="cartao p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="meus-deputados" className="font-display flex items-center gap-2 text-2xl leading-none">
            <Star size={20} className="text-[#b58900] dark:text-[#ffdf00]" fill="currentColor" aria-hidden /> Meus deputados
          </h2>
          <p className="mt-1 text-sm text-muted">Em quem você votou ou quer acompanhar. A lista fica só neste navegador; ninguém mais vê.</p>
        </div>
        {ids.length ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/deputados/?favoritos=sim" className="pilula">Ver na lista</Link>
            <Link href="/alertas/?favoritos=sim" className="pilula">Pontos de atenção</Link>
            {ids.length >= 2 ? <Link href={`/deputados/comparar/?ids=${ids.slice(0, 4).join(",")}`} className="pilula">Comparar</Link> : null}
          </div>
        ) : null}
      </div>

      {!ids.length ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
          Toque na estrela <Star size={14} className="inline align-[-2px]" aria-hidden /> ao lado de qualquer deputado, na{" "}
          <Link href="/deputados/" className="text-destaque underline">lista</Link> ou no perfil, para acompanhar aqui presença,
          gastos, emendas e pontos de atenção de quem você escolheu.
        </p>
      ) : !dados ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {meus.map((d) => {
            const i = d.indicadores;
            return (
              <li key={d.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start gap-3">
                  <Foto src={d.foto} nome={d.nome} tamanho={44} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/deputado/${d.id}/`} className="font-semibold hover:underline">{d.nome}</Link>
                    <p className="text-xs text-muted">{d.partido_atual}-{d.uf}{d.em_exercicio ? "" : " · fora do exercício"}</p>
                  </div>
                  <BotaoFavorito id={d.id} nome={d.nome} />
                </div>
                <dl className="num mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div><dt className="text-muted">Presença</dt><dd className="font-semibold">{ouTraco(i?.pct_presenca_sessoes, (v) => pct(v))}</dd></div>
                  <div><dt className="text-muted">Faltas sem justificativa</dt><dd className="font-semibold">{ouTraco(i?.n_faltas_sem_justificativa, num)}</dd></div>
                  <div><dt className="text-muted">Gasto mensal da cota</dt><dd className="font-semibold">{ouTraco(i?.gasto_medio_mensal, brl)}</dd></div>
                  <div><dt className="text-muted">Emendas empenhadas</dt><dd className="font-semibold">{ouTraco(d.emendas_empenhado, brlCurto)}</dd></div>
                </dl>
                {d.n_alertas ? (
                  <Link href={`/deputado/${d.id}/`} className="mt-2 inline-flex items-center gap-1 text-xs hover:underline">
                    <AlertTriangle size={12} className="text-atencao" aria-hidden />{d.n_alertas} ponto(s) de atenção
                  </Link>
                ) : <p className="mt-2 text-xs text-muted">Nenhum ponto de atenção.</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
