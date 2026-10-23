import { describe, expect, it } from "vitest";
import { gerarDestaques } from "@/lib/destaques";
import type { DeputadoResumo, Indicadores, Serie } from "@/lib/types";

const ind = (o: Partial<Indicadores>): Indicadores => ({
  gasto_total: 0, gasto_medio_mensal: 0, pct_cota_usada: 0, pct_maior_fornecedor: 0, n_proposicoes_relevantes: 0,
  n_proposicoes_coautor: 0, n_requerimentos: 0, n_relatorias: 0, n_aprovadas: 0, pct_presenca_sessoes: 0.9,
  pct_participacao_votacoes: 0.9, pct_alinhamento_partido: 0.9, pct_alinhamento_governo: 0.5, n_votos_contra_bancada: 0,
  custo_por_proposicao: null, custo_por_sessao: null, n_faltas_sem_justificativa: 0, n_faltas_justificadas: 0,
  meses_exercicio: 20, ...o,
});
const dep = (id: number, nome: string, o: Partial<Indicadores>, regras: string[] = []): DeputadoResumo => ({
  id, nome, uf: "SP", partido_atual: "AAA", foto: null, sexo: null, situacao: null, condicao_eleitoral: null,
  inicio_exercicio: null, fim_exercicio: null, em_exercicio: true, trocou_partido: false, indicadores: ind(o), posicoes: {},
  n_alertas: regras.length, regras_alerta: regras,
});

describe("gerarDestaques", () => {
  const deps = [
    dep(1, "Ana", { gasto_total: 900, pct_presenca_sessoes: 0.4 }, ["L02", "G04"]),
    dep(2, "Beto", { gasto_total: 100, n_proposicoes_relevantes: 9, pct_alinhamento_partido: 0.6 }),
    dep(3, "Caio", { gasto_total: 200, meses_exercicio: 0.2, pct_presenca_sessoes: 0.1 }),
  ];
  const serie: Serie = { metrica: "gasto", pontos: [{ periodo: "2024-12", valor: 10 }], picos: [{ periodo: "2024-12", valor: 10, fator: 3.2, rotulo: "pico: 3,2× a média" }] };
  const d = gerarDestaques(deps, [serie]);

  it("maior gasto com fator sobre a mediana", () => {
    const g = d.find((x) => x.tipo === "gasto")!;
    expect(g.texto).toContain("Ana");
    expect(g.texto).toContain("1,8×"); // mediana dos ativos (Ana 900, Beto 100) = 500
  });
  it("ignora quem tem menos de 1 mês de exercício", () => {
    expect(d.find((x) => x.tipo === "presenca")!.texto).toContain("Ana");
  });
  it("conta quadrante e passagens a terceiros", () => {
    expect(d.find((x) => x.tipo === "quadrante")!.texto).toContain("1 deputado");
    expect(d.find((x) => x.tipo === "passagens")!.texto).toContain("1 deputado");
  });
  it("pico mais recente", () => expect(d.find((x) => x.tipo === "pico")!.texto).toContain("dez/2024"));
  it("mais projetos e menos alinhado", () => {
    expect(d.find((x) => x.tipo === "entrega")!.texto).toContain("Beto");
    expect(d.find((x) => x.tipo === "rebeldia")!.texto).toContain("Beto");
  });
});
