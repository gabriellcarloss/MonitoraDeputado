import { CalendarCheck, FileText, Gauge, Scale, Wallet } from "lucide-react";
import { INDICADORES } from "@/lib/indicadores";
import type { Indicadores, NomeIndicador, Posicoes } from "@/lib/types";

const ICONES = { Custo: Wallet, Entrega: FileText, "Presença": CalendarCheck, Comportamento: Scale, "Eficiência": Gauge } as const;

const GRUPOS: { titulo: keyof typeof ICONES; itens: NomeIndicador[] }[] = [
  { titulo: "Custo", itens: ["gasto_total", "gasto_medio_mensal", "pct_cota_usada", "pct_maior_fornecedor"] },
  { titulo: "Entrega", itens: ["n_proposicoes_relevantes", "n_aprovadas", "n_relatorias", "n_proposicoes_coautor", "n_requerimentos"] },
  { titulo: "Presença", itens: ["pct_presenca_sessoes", "pct_participacao_votacoes", "n_faltas_sem_justificativa", "n_faltas_justificadas"] },
  { titulo: "Comportamento", itens: ["pct_alinhamento_partido", "pct_alinhamento_governo", "n_votos_contra_bancada"] },
  { titulo: "Eficiência", itens: ["custo_por_proposicao", "custo_por_sessao"] },
];

/** Boletim de desempenho: cada indicador com a posição no ranking nacional (1º = melhor). */
export function Boletim({ indicadores, posicoes, total }: { indicadores: Indicadores | null; posicoes: Posicoes; total: number }) {
  const semDados = !indicadores || indicadores.meses_exercicio < 1 ||
    (indicadores.gasto_total === 0 && indicadores.pct_participacao_votacoes === null && indicadores.n_proposicoes_relevantes === 0);
  return (
    <div className="space-y-4">
      {semDados ? (
        <p className="rounded-lg border border-border bg-subtle p-3 text-sm text-muted">
          Sem registros no período — o deputado pode ter assumido há pouco tempo ou estar fora do exercício.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {GRUPOS.map((g, gi) => {
          const Icone = ICONES[g.titulo];
          return (
            <section key={g.titulo} className="cartao p-4" data-revelar style={{ ["--atraso" as string]: `${gi * 60}ms` }}>
              <h3 className="mb-3 flex items-center gap-2.5 font-display text-xl leading-none">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#0e7c52] to-[#1f4fa3] text-white shadow-[0_8px_18px_-8px_rgb(14_124_82/0.8)]"><Icone size={18} aria-hidden /></span>
                {g.titulo}
              </h3>
              <dl className="space-y-3">
                {g.itens.map((k) => {
                  const info = INDICADORES[k];
                  const pos = posicoes[k];
                  const t = pos?.total ?? total;
                  const melhor = pos && t > 1 ? Math.round((1 - (pos.brasil - 1) / (t - 1)) * 100) : null;
                  return (
                    <div key={k}>
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-sm" title={info.ajuda}>{info.rotulo}</dt>
                        <dd className="text-right">
                          <span className="num font-semibold">{info.formato(indicadores?.[k])}</span>
                          {pos ? <span className="block text-xs text-muted">{pos.brasil}º de {t}</span> : null}
                        </dd>
                      </div>
                      {melhor !== null ? (
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-subtle" role="img" aria-label={`À frente de ${melhor}% dos deputados`}>
                          <div className="h-full origin-left rounded-full bg-gradient-to-r from-[#0e7c52] via-[#ffdf00] to-[#1f4fa3]" style={{ width: `${Math.max(4, melhor)}%`, animation: "crescer-x 1s cubic-bezier(.2,.8,.2,1) both" }} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </dl>
            </section>
          );
        })}
      </div>
      <p className="text-xs text-muted">Posição 1º = melhor resultado (menor gasto, maior presença, mais projetos…). Passe o mouse no nome do indicador para ver a definição.</p>
    </div>
  );
}
