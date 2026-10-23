import { brl, brlCurto, num, pct } from "./format";
import type { DeputadoDetalhe } from "./types";

/** Frase com os números principais, usada na prévia do link (WhatsApp, redes) e nos buscadores. */
export function resumoDeputado(d: DeputadoDetalhe): string {
  const i = d.indicadores;
  const partes: string[] = [];
  if (i?.pct_presenca_sessoes != null) partes.push(`presença de ${pct(i.pct_presenca_sessoes, 0)} nas sessões`);
  if (i?.n_faltas_sem_justificativa) partes.push(`${num(i.n_faltas_sem_justificativa)} faltas sem justificativa`);
  if (i && i.gasto_medio_mensal > 0) partes.push(`${brl(i.gasto_medio_mensal)}/mês da cota parlamentar`);
  if (i) partes.push(`${num(i.n_proposicoes_relevantes)} projetos apresentados`);
  if (d.emendas?.empenhado) partes.push(`${brlCurto(d.emendas.empenhado)} em emendas`);
  if (d.alertas.length) partes.push(`${d.alertas.length} ponto(s) de atenção`);
  const p = d.deputado;
  return `${p.nome} (${p.partido_atual}-${p.uf})${partes.length ? `: ${partes.join(", ")}` : ""}. Dados públicos oficiais, atualizados diariamente.`;
}
