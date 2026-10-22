import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Boletim } from "@/components/deputado/Boletim";
import { SeloAlerta } from "@/components/deputado/SeloAlerta";
import type { Alerta, Indicadores } from "@/lib/types";

const SUPLENTE: Indicadores = {
  gasto_total: 0, gasto_medio_mensal: 0, pct_cota_usada: 0, pct_maior_fornecedor: 0, n_proposicoes_relevantes: 0,
  n_proposicoes_coautor: 0, n_requerimentos: 0, n_relatorias: 0, n_aprovadas: 0, pct_presenca_sessoes: null,
  pct_participacao_votacoes: null, pct_alinhamento_partido: null, pct_alinhamento_governo: null,
  n_votos_contra_bancada: 0, custo_por_proposicao: null, custo_por_sessao: null, meses_exercicio: 0.4,
};

describe("Boletim", () => {
  it("suplente sem registros: traços, aviso e nenhum NaN", () => {
    const { container } = render(<Boletim indicadores={SUPLENTE} posicoes={{}} total={513} />);
    expect(screen.getByText(/sem registros no período/i)).toBeTruthy();
    expect(container.textContent).not.toMatch(/NaN|Infinity|undefined/);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });
  it("indicadores nulos", () => {
    render(<Boletim indicadores={null} posicoes={{}} total={513} />);
    expect(screen.getByText(/sem registros no período/i)).toBeTruthy();
  });
  it("mostra posição no ranking", () => {
    render(<Boletim indicadores={{ ...SUPLENTE, gasto_total: 1000, meses_exercicio: 20 }}
      posicoes={{ gasto_total: { brasil: 12, uf: 3, partido: 2, percentil: 40 } }} total={513} />);
    expect(screen.getByText("12º de 513")).toBeTruthy();
  });
});

describe("SeloAlerta", () => {
  const alerta: Alerta = {
    id: "G04-1", regra: "G04", deputado_id: 1, severidade: "alta", titulo: "Passagens emitidas para outras pessoas",
    descricao: "6 passagens para terceiros", evidencias: [{ tipo: "nota", ref: "FULANO — BSB/GRU", valor: 900, url: "https://doc/1.pdf" }],
  };
  it("mostra rodapé exato, severidade em texto e link de evidência", () => {
    render(<SeloAlerta alerta={alerta} />);
    expect(screen.getByText("Ponto de atenção gerado automaticamente a partir de dados públicos. Não constitui acusação.")).toBeTruthy();
    expect(screen.getByText("Alta")).toBeTruthy();
    expect(screen.getByRole("link", { name: /FULANO/ }).getAttribute("href")).toBe("https://doc/1.pdf");
  });
});

describe("Boletim — população do ranking", () => {
  it("usa o total da posição, não o total geral", () => {
    render(<Boletim indicadores={{ ...SUPLENTE, gasto_total: 1000, meses_exercicio: 20 }}
      posicoes={{ gasto_total: { brasil: 12, uf: 3, partido: 2, percentil: 40, total: 498 } }} total={513} />);
    expect(screen.getByText("12º de 498")).toBeTruthy();
  });
});
