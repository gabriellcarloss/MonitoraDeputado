import type { Alerta, DeputadoResumo, Indicadores } from "./types";

export const MESES_MINIMOS = 6;

/** Componentes do índice: quanto maior, melhor (gasto entra invertido). */
export const COMPONENTES: { rotulo: string; valor: (i: Indicadores) => number | null; menorMelhor?: boolean; nota?: string }[] = [
  { rotulo: "Presença em sessões", valor: (i) => i.pct_presenca_sessoes, nota: "ausências justificadas oficialmente não contam como falta" },
  { rotulo: "Participação em votações", valor: (i) => i.pct_participacao_votacoes },
  { rotulo: "Projetos apresentados por mês", valor: (i) => i.n_proposicoes_relevantes / i.meses_exercicio,
    nota: "PL, PLP, PEC e PDL como autor principal" },
  { rotulo: "Relatorias por mês", valor: (i) => i.n_relatorias / i.meses_exercicio,
    nota: "relatar é trabalho legislativo que a contagem de projetos não captura" },
  { rotulo: "Uso da cota parlamentar", valor: (i) => i.pct_cota_usada, menorMelhor: true,
    nota: "em % do teto da UF, para não punir quem é de estado distante (a cota de RR é maior que a do DF)" },
];

export interface NotaIndice { id: number; nota: number; deputado: DeputadoResumo }

function percentis(valores: (number | null)[], menorMelhor = false): (number | null)[] {
  const ord = valores.filter((v): v is number => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
  if (ord.length < 2) return valores.map((v) => (v === null ? null : 0.5));
  return valores.map((v) => {
    if (v === null || !Number.isFinite(v)) return null;
    const abaixo = ord.findIndex((x) => x >= v);
    const iguais = ord.filter((x) => x === v).length;
    const p = (abaixo + (iguais - 1) / 2) / (ord.length - 1);
    return menorMelhor ? 1 - p : p;
  });
}

/**
 * Índice de desempenho (0–100): média dos percentis de presença, participação em votações, projetos por mês
 * relatorias por mês e uso da cota (em % do teto da UF), entre deputados com pelo menos 6 meses de exercício. Componentes sem dado são ignorados.
 */
export function indiceDesempenho(deps: DeputadoResumo[]): NotaIndice[] {
  const elegiveis = deps.filter((d) => d.indicadores && d.indicadores.meses_exercicio >= MESES_MINIMOS);
  const colunas = COMPONENTES.map((c) => percentis(elegiveis.map((d) => c.valor(d.indicadores!)), c.menorMelhor));
  return elegiveis.map((d, i) => {
    const ps = colunas.map((col) => col[i]).filter((p): p is number => p !== null);
    return { id: d.id, deputado: d, nota: ps.length ? Math.round((100 * ps.reduce((s, p) => s + p, 0)) / ps.length) : 0 };
  }).sort((a, b) => b.nota - a.nota || a.deputado.nome.localeCompare(b.deputado.nome));
}

/** Quem mais e quem menos gasta por mês, entre quem tem 6+ meses de exercício e usou a cota. */
export function contrasteGasto(deps: DeputadoResumo[]) {
  const base = deps.filter((d) => d.indicadores && d.indicadores.meses_exercicio >= MESES_MINIMOS && d.indicadores.gasto_medio_mensal > 0)
    .sort((a, b) => b.indicadores!.gasto_medio_mensal - a.indicadores!.gasto_medio_mensal);
  return base.length >= 2 ? { maior: base[0], menor: base[base.length - 1] } : null;
}

/** Alertas de severidade alta para a vitrine: um por deputado, priorizando regras diferentes. */
export function alertasEmDestaque(alertas: Alerta[], n: number): Alerta[] {
  const altas = alertas.filter((a) => a.severidade === "alta");
  const deps = new Set<number>();
  const regras = new Set<string>();
  const out: Alerta[] = [];
  for (const a of altas) {
    if (out.length >= n) break;
    if (!deps.has(a.deputado_id) && !regras.has(a.regra)) { out.push(a); deps.add(a.deputado_id); regras.add(a.regra); }
  }
  for (const a of altas) {
    if (out.length >= n) break;
    if (!deps.has(a.deputado_id)) { out.push(a); deps.add(a.deputado_id); }
  }
  return out;
}
