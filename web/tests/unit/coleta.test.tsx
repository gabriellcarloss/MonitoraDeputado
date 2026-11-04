import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Cadastro } from "@/components/coleta/Cadastro";
import { canal, dadosAcesso, deputadoDoTitulo, sistemaNavegador } from "@/components/coleta/Acessos";
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
    expect(d).toMatchObject({
      pagina: "/deputado/1/", referencia: "www.linkedin.com", utm_source: "linkedin", utm_medium: "", utm_campaign: "lancamento",
      dispositivo: "celular", sessao: "abc123", canal: "LinkedIn", evento: "pagina",
    });
    expect(JSON.stringify(d)).not.toContain("segredo");
    expect(dadosAcesso({ pathname: "/", search: "" }, "", 1400, "x").referencia).toBe("direto");
    expect(dadosAcesso({ pathname: "/", search: "" }, "isso-nao-e-url", 900, "x")).toMatchObject({ referencia: "direto", dispositivo: "tablet" });
  });

  it("acesso a deputado traz nome, partido e UF do título; localização aproximada; nada digitado", () => {
    const d = dadosAcesso({ pathname: "/deputado/204365/", search: "?aba=gastos&busca=texto-digitado" }, "https://l.instagram.com/", 1440, "s1", {
      titulo: "Gilson Marques (NOVO-SC) · MonitoraDeputado", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
      idioma: "pt-BR", fuso: "America/Sao_Paulo", local: { cidade: "Florianópolis", estado: "SC", pais: "BR" }, visitante: "novo", n: 1,
    });
    expect(d).toMatchObject({ deputado: "Gilson Marques", partido: "NOVO", uf_deputado: "SC", id_deputado: "204365", parametros: "aba=gastos",
      canal: "Instagram", cidade: "Florianópolis", estado: "SC", sistema: "iOS", navegador: "Safari", visitante: "novo", n_pagina: "1" });
    expect(JSON.stringify(d)).not.toContain("texto-digitado");
    expect(dadosAcesso({ pathname: "/gastos/", search: "" }, "", 1400, "x", { titulo: "Gastos · MonitoraDeputado" }).deputado).toBe("");
  });

  it("classifica canal, sistema e título", () => {
    expect(canal("www.google.com", "email", "email")).toBe("E-mail");
    expect(canal("www.google.com", "", "")).toBe("Busca");
    expect(canal("direto", "chatgpt.com", "")).toBe("Assistente de IA");
    expect(canal("direto", "", "")).toBe("Direto");
    expect(sistemaNavegador("Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36")).toEqual({ sistema: "Android", navegador: "Chrome" });
    expect(sistemaNavegador("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36 Edg/120")).toEqual({ sistema: "Windows", navegador: "Edge" });
    expect(deputadoDoTitulo("Pr. Marco Feliciano (PL-SP) · MonitoraDeputado")).toEqual({ nome: "Pr. Marco Feliciano", partido: "PL", uf: "SP" });
    expect(deputadoDoTitulo("Chiquinho Brazão (S.PART.-RJ) · MonitoraDeputado")?.partido).toBe("S.PART.");
    expect(deputadoDoTitulo("Gastos · MonitoraDeputado")).toBeNull();
  });

  it("gera os links de compartilhamento com texto e endereço codificados", () => {
    const l = linksCompartilhar("Fulano (PX-SP): 90% de presença", "https://site.exemplo/deputado/1/");
    expect(l.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent("Fulano (PX-SP): 90% de presença https://site.exemplo/deputado/1/")}`);
    expect(l.x).toContain("text=Fulano%20(PX-SP)");
    expect(l.x).toContain(`url=${encodeURIComponent("https://site.exemplo/deputado/1/")}`);
    expect(l.linkedin).toContain(encodeURIComponent("https://site.exemplo/deputado/1/"));
  });
});
