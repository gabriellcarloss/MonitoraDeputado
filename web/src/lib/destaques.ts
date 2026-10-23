import { brl, mes, num, pct } from "./format";
import type { DeputadoResumo, Indicadores, Serie } from "./types";

export interface Destaque {
  tipo: "gasto" | "pico" | "presenca" | "quadrante" | "passagens" | "entrega" | "rebeldia";
  titulo: string;
  texto: string;
  href?: string;
}

function mediana(v: number[]) {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
}

/** Destaques automáticos da página inicial, gerados a partir dos indicadores a cada atualização. */
export function gerarDestaques(deps: DeputadoResumo[], seriesBrasil: Serie[]): Destaque[] {
  const ativos = deps.filter((d) => d.indicadores && d.indicadores.meses_exercicio >= 1);
  const v = (d: DeputadoResumo, k: keyof Indicadores) => d.indicadores![k] as number | null;
  const maior = (k: keyof Indicadores, asc = false) =>
    ativos.filter((d) => v(d, k) !== null).sort((a, b) => ((v(a, k)! - v(b, k)!) * (asc ? 1 : -1)))[0];
  const nome = (d: DeputadoResumo) => `${d.nome} (${d.partido_atual}-${d.uf})`;
  const out: Destaque[] = [];

  const g = maior("gasto_total");
  const med = mediana(ativos.map((d) => v(d, "gasto_total") ?? 0));
  if (g) out.push({ tipo: "gasto", titulo: "Maior gasto", href: `/deputado/${g.id}/?aba=gastos`,
    texto: `${nome(g)} gastou ${brl(v(g, "gasto_total")!)}${med > 0 ? `, ${(v(g, "gasto_total")! / med).toFixed(1).replace(".", ",")}× a mediana` : ""}.` });

  const gasto = seriesBrasil.find((s) => s.metrica === "gasto");
  const pico = gasto?.picos.at(-1);
  if (pico) out.push({ tipo: "pico", titulo: "Pico de gastos", href: "/gastos/",
    texto: `${mes(pico.periodo)}: ${brl(pico.valor)} na cota (${pico.rotulo.replace("pico: ", "")}).` });

  const p = maior("pct_presenca_sessoes", true);
  if (p) out.push({ tipo: "presenca", titulo: "Menor presença", href: `/deputado/${p.id}/?aba=presenca`,
    texto: `${nome(p)} esteve em ${pct(v(p, "pct_presenca_sessoes")!)} das sessões deliberativas.` });

  const plural = (n: number) => `${num(n)} deputado${n === 1 ? "" : "s"}`;
  const q = ativos.filter((d) => d.regras_alerta.includes("L02")).length;
  out.push({ tipo: "quadrante", titulo: "Gasta muito, entrega pouco", href: "/alertas/?regra=L02",
    texto: `${plural(q)} entre os 25% que mais gastam e os 25% que menos apresentam projetos.` });

  const t = ativos.filter((d) => d.regras_alerta.includes("G04")).length;
  out.push({ tipo: "passagens", titulo: "Passagens fora da equipe", href: "/alertas/?regra=G04",
    texto: `${plural(t)} emitiram passagens pela cota para pessoas que não estão na equipe atual do gabinete.` });

  const e = maior("n_proposicoes_relevantes");
  if (e) out.push({ tipo: "entrega", titulo: "Mais projetos", href: `/deputado/${e.id}/?aba=proposicoes`,
    texto: `${nome(e)} apresentou ${num(v(e, "n_proposicoes_relevantes")!)} projetos como autor.` });

  const r = maior("pct_alinhamento_partido", true);
  if (r) out.push({ tipo: "rebeldia", titulo: "Menos alinhado ao partido", href: `/deputado/${r.id}/?aba=votacoes`,
    texto: `${nome(r)} seguiu o partido em ${pct(v(r, "pct_alinhamento_partido")!)} das votações orientadas.` });
  return out;
}
