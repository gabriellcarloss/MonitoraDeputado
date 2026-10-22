import { INDICADORES } from "@/lib/indicadores";
import type { Indicadores, NomeIndicador, Posicoes } from "@/lib/types";

const GRUPOS: { titulo: string; itens: NomeIndicador[] }[] = [
  { titulo: "Custo", itens: ["gasto_total", "gasto_medio_mensal", "pct_cota_usada", "pct_maior_fornecedor"] },
  { titulo: "Entrega", itens: ["n_proposicoes_relevantes", "n_aprovadas", "n_relatorias", "n_proposicoes_coautor", "n_requerimentos"] },
  { titulo: "Presença", itens: ["pct_presenca_sessoes", "pct_participacao_votacoes"] },
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
        {GRUPOS.map((g) => (
          <section key={g.titulo} className="cartao p-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{g.titulo}</h3>
            <dl className="space-y-2">
              {g.itens.map((k) => {
                const info = INDICADORES[k];
                const pos = posicoes[k];
                return (
                  <div key={k} className="flex items-baseline justify-between gap-3">
                    <dt className="text-sm" title={info.ajuda}>{info.rotulo}</dt>
                    <dd className="text-right">
                      <span className="num font-semibold">{info.formato(indicadores?.[k])}</span>
                      {pos ? <span className="block text-xs text-muted">{pos.brasil}º de {total}</span> : null}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
      <p className="text-xs text-muted">Posição 1º = melhor resultado (menor gasto, maior presença, mais projetos…). Passe o mouse no nome do indicador para ver a definição.</p>
    </div>
  );
}
