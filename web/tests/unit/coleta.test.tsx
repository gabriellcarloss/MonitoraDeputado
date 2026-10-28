import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Cadastro } from "@/components/coleta/Cadastro";
import { dadosAcesso } from "@/components/coleta/Acessos";
import { linksCompartilhar } from "@/components/coleta/Compartilhar";
import { coletaAtiva, emailValido } from "@/lib/coleta";

describe("coleta", () => {
  it("valida e-mails", () => {
    expect(emailValido("pessoa@exemplo.com")).toBe(true);
    expect(emailValido(" pessoa@exemplo.com ")).toBe(true);
    expect(emailValido("pessoa@exemplo")).toBe(false);
    expect(emailValido("sem arroba.com")).toBe(false);
    expect(emailValido("")).toBe(false);
  });

  it("fica desligada sem NEXT_PUBLIC_COLETA_URL e o cadastro não aparece", () => {
    expect(coletaAtiva).toBe(false);
    const { container } = render(<Cadastro origem="teste" />);
    expect(container.innerHTML).toBe("");
    expect(screen.queryByText(/Quero receber/i)).toBeNull();
  });

  it("monta os dados de acesso sem identificar a pessoa", () => {
    const d = dadosAcesso({ pathname: "/deputado/1/", search: "?utm_source=linkedin&utm_campaign=lancamento" }, "https://www.linkedin.com/feed/post?x=segredo", 390, "abc123");
    expect(d).toEqual({
      pagina: "/deputado/1/", referencia: "www.linkedin.com", utm_source: "linkedin", utm_medium: "", utm_campaign: "lancamento",
      dispositivo: "celular", sessao: "abc123",
    });
    expect(dadosAcesso({ pathname: "/", search: "" }, "", 1400, "x").referencia).toBe("direto");
    expect(dadosAcesso({ pathname: "/", search: "" }, "isso-nao-e-url", 900, "x")).toMatchObject({ referencia: "direto", dispositivo: "tablet" });
  });

  it("gera os links de compartilhamento com texto e endereço codificados", () => {
    const l = linksCompartilhar("Fulano (PX-SP): 90% de presença", "https://site.exemplo/deputado/1/");
    expect(l.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent("Fulano (PX-SP): 90% de presença https://site.exemplo/deputado/1/")}`);
    expect(l.x).toContain("text=Fulano%20(PX-SP)");
    expect(l.x).toContain(`url=${encodeURIComponent("https://site.exemplo/deputado/1/")}`);
    expect(l.linkedin).toContain(encodeURIComponent("https://site.exemplo/deputado/1/"));
  });
});
