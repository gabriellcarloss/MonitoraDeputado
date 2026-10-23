import { describe, expect, it } from "vitest";
import { alertasEmDestaque, contrasteGasto, indiceDesempenho } from "@/lib/indice";
import type { Alerta, DeputadoResumo, Indicadores } from "@/lib/types";

const ind = (o: Partial<Indicadores>): Indicadores => ({
  gasto_total: 100000, gasto_medio_mensal: 30000, pct_cota_usada: 0.7, pct_maior_fornecedor: 0.2, n_proposicoes_relevantes: 5,
  n_proposicoes_coautor: 0, n_requerimentos: 0, n_relatorias: 0, n_aprovadas: 0, pct_presenca_sessoes: 0.8,
  pct_participacao_votacoes: 0.8, pct_alinhamento_partido: 0.9, pct_alinhamento_governo: 0.5, n_votos_contra_bancada: 0,
  custo_por_proposicao: null, custo_por_sessao: null, n_faltas_sem_justificativa: 2, n_faltas_justificadas: 0,
  meses_exercicio: 20, ...o,
});
const dep = (id: number, o: Partial<Indicadores>, extra: Partial<DeputadoResumo> = {}): DeputadoResumo => ({
  id, nome: `D${id}`, uf: "SP", partido_atual: "AAA", foto: null, sexo: null, situacao: null, condicao_eleitoral: null,
  inicio_exercicio: null, fim_exercicio: null, em_exercicio: true, trocou_partido: false, indicadores: ind(o), posicoes: {},
  n_alertas: 0, regras_alerta: [], ...extra,
});

describe("indiceDesempenho", () => {
  const deps = [
    dep(1, { pct_presenca_sessoes: 0.99, pct_participacao_votacoes: 0.98, n_proposicoes_relevantes: 40, gasto_medio_mensal: 15000 }),
    dep(2, { pct_presenca_sessoes: 0.5, pct_participacao_votacoes: 0.5, n_proposicoes_relevantes: 0, gasto_medio_mensal: 45000 }),
    dep(3, {}),
    dep(4, { meses_exercicio: 3, pct_presenca_sessoes: 1, n_proposicoes_relevantes: 50, gasto_medio_mensal: 1000 }),
  ];
  const r = indiceDesempenho(deps);
  it("melhor em tudo fica em 1º e pior em último", () => {
    expect(r[0].id).toBe(1);
    expect(r.at(-1)!.id).toBe(2);
  });
  it("exige ao menos 6 meses de exercício", () => expect(r.some((x) => x.id === 4)).toBe(false));
  it("nota entre 0 e 100", () => expect(r.every((x) => x.nota >= 0 && x.nota <= 100)).toBe(true));
  it("compara uso da cota em % do teto da UF, não o gasto absoluto", () => {
    // RR tem cota maior: gasta mais em reais, mas usa menos do próprio teto
    const rr = dep(1, { gasto_medio_mensal: 45000, pct_cota_usada: 0.6 }, { uf: "RR" });
    const df = dep(2, { gasto_medio_mensal: 30000, pct_cota_usada: 0.9 }, { uf: "DF" });
    expect(indiceDesempenho([rr, df])[0].id).toBe(1);
  });
  it("relatorias contam a favor", () => {
    const a = dep(1, { n_relatorias: 12 });
    const b = dep(2, { n_relatorias: 0 });
    expect(indiceDesempenho([a, b])[0].id).toBe(1);
  });
});

describe("contrasteGasto", () => {
  it("ignora gasto zero e mandatos curtos; compara gasto mensal", () => {
    const deps = [dep(1, { gasto_medio_mensal: 40000 }), dep(2, { gasto_medio_mensal: 0, gasto_total: 0 }),
      dep(3, { gasto_medio_mensal: 10000 }), dep(4, { gasto_medio_mensal: 500, meses_exercicio: 2 })];
    const c = contrasteGasto(deps)!;
    expect([c.maior.id, c.menor.id]).toEqual([1, 3]);
  });
});

describe("alertasEmDestaque", () => {
  const a = (id: string, regra: string, dep: number, sev: Alerta["severidade"]): Alerta =>
    ({ id, regra, deputado_id: dep, severidade: sev, titulo: regra, descricao: "", evidencias: [] });
  it("só severidade alta, um por deputado, variando as regras", () => {
    const lista = [a("1", "G04", 1, "alta"), a("2", "G05", 1, "alta"), a("3", "G04", 2, "alta"), a("4", "L02", 3, "alta"),
      a("5", "P01", 4, "atencao"), a("6", "G04", 5, "alta")];
    const r = alertasEmDestaque(lista, 3);
    expect(r.map((x) => x.deputado_id)).toEqual([1, 3, 2]);
    expect(new Set(r.map((x) => x.deputado_id)).size).toBe(3);
  });
});

describe("resumoDeputado (prévia de link)", () => {
  it("frase com números e sem NaN", async () => {
    const { resumoDeputado } = await import("@/lib/resumo");
    const r = resumoDeputado({
      deputado: { id: 1, nome: "Ana", uf: "SP", partido_atual: "AAA" }, indicadores: ind({ n_faltas_sem_justificativa: 3 }),
      alertas: [], emendas: { empenhado: 2_500_000 },
    } as never);
    expect(r).toMatch(/^Ana \(AAA-SP\): presença de 80% nas sessões, 3 faltas sem justificativa/);
    expect(r).toContain("R$ 2,5 mi em emendas");
    expect(r).not.toMatch(/NaN|undefined/);
  });
});
