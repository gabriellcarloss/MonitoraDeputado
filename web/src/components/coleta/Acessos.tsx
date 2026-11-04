"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { coletaAtiva, enviar } from "@/lib/coleta";

const SESSAO = "md:sessao";
const CONTADOR = "md:paginas";
const LOCAL = "md:local";
const VISITOU = "md:visitou";

/** Parâmetros que descrevem o conteúdo visto (nunca texto digitado, como a busca por nome). */
const PARAMS_PERMITIDOS = ["aba", "id", "cnpj", "uf", "partido", "regra", "categoria", "favoritos"];

export interface Local { cidade: string; estado: string; pais: string }

/** De onde a pessoa veio, em poucas categorias (para a planilha somar por canal). */
export function canal(referencia: string, utmSource: string, utmMedium: string): string {
  const r = `${referencia} ${utmSource}`.toLowerCase();
  if (/whatsapp|wa\.me|l\.wl\.co/.test(r)) return "WhatsApp";
  if (/instagram/.test(r)) return "Instagram";
  if (/facebook|fb\.com|l\.messenger/.test(r)) return "Facebook";
  if (/linkedin|lnkd/.test(r)) return "LinkedIn";
  if (/t\.co\b|twitter|x\.com/.test(r)) return "X/Twitter";
  if (/telegram|t\.me/.test(r)) return "Telegram";
  if (/youtube/.test(r)) return "YouTube";
  if (/chatgpt|openai|perplexity|claude\.ai|gemini/.test(r)) return "Assistente de IA";
  if (utmMedium.toLowerCase() === "email" || /mail|sendibt|brevo|mailchimp/.test(r)) return "E-mail";
  if (/google|bing|duckduckgo|yahoo|brave|ecosia/.test(r)) return "Busca";
  if (/monitoradeputado/.test(r)) return "Interno";
  if (referencia === "direto") return "Direto";
  return "Outros sites";
}

/** Sistema e navegador só pela família (Android, Chrome…), sem versão nem modelo do aparelho. */
export function sistemaNavegador(ua: string): { sistema: string; navegador: string } {
  const sistema = /android/i.test(ua) ? "Android" : /iphone|ipad|ipod/i.test(ua) ? "iOS" : /windows/i.test(ua) ? "Windows"
    : /mac os x|macintosh/i.test(ua) ? "macOS" : /cros/i.test(ua) ? "ChromeOS" : /linux/i.test(ua) ? "Linux" : "Outro";
  const navegador = /edg\//i.test(ua) ? "Edge" : /opr\/|opera/i.test(ua) ? "Opera" : /samsungbrowser/i.test(ua) ? "Samsung Internet"
    : /firefox|fxios/i.test(ua) ? "Firefox" : /crios|chrome\//i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : "Outro";
  return { sistema, navegador };
}

/** "Fulano (PL-SP) · MonitoraDeputado" → nome, partido e UF do deputado da página. */
export function deputadoDoTitulo(titulo: string): { nome: string; partido: string; uf: string } | null {
  const m = titulo.replace(/\s*·\s*MonitoraDeputado\s*$/, "").match(/^(.+) \(([^()]+)-([A-Z]{2})\)$/);
  return m ? { nome: m[1].trim(), partido: m[2].trim(), uf: m[3] } : null;
}

/**
 * Dados de uma página vista, sem nada que identifique a pessoa: página, conteúdo, origem (só o domínio), utm,
 * tipo de aparelho e família do sistema/navegador, idioma, fuso e localização aproximada (cidade/UF, sem IP).
 */
export function dadosAcesso(loc: Pick<Location, "pathname" | "search">, referrer: string, largura: number, sessao: string,
  extra: { titulo?: string; ua?: string; idioma?: string; fuso?: string; tema?: string; local?: Local | null; visitante?: string;
    n?: number; evento?: string } = {}) {
  const q = new URLSearchParams(loc.search);
  let ref = "direto";
  try { ref = referrer ? new URL(referrer).hostname : "direto"; } catch {}
  const dep = /^\/deputado\/\d+\/?$/.test(loc.pathname) && extra.titulo ? deputadoDoTitulo(extra.titulo) : null;
  const params = PARAMS_PERMITIDOS.filter((k) => q.get(k)).map((k) => `${k}=${(q.get(k) ?? "").slice(0, 40)}`).join("&");
  const { sistema, navegador } = sistemaNavegador(extra.ua ?? "");
  const utm = { utm_source: q.get("utm_source") ?? "", utm_medium: q.get("utm_medium") ?? "", utm_campaign: q.get("utm_campaign") ?? "" };
  return {
    pagina: loc.pathname,
    referencia: ref,
    ...utm,
    dispositivo: largura < 768 ? "celular" : largura < 1100 ? "tablet" : "computador",
    sessao,
    evento: extra.evento ?? "pagina",
    titulo: (extra.titulo ?? "").replace(/\s*·\s*MonitoraDeputado\s*$/, "").slice(0, 120),
    deputado: dep?.nome ?? "",
    partido: dep?.partido ?? "",
    uf_deputado: dep?.uf ?? "",
    id_deputado: dep ? (loc.pathname.match(/\d+/)?.[0] ?? "") : "",
    parametros: params,
    canal: canal(ref, utm.utm_source, utm.utm_medium),
    cidade: extra.local?.cidade ?? "",
    estado: extra.local?.estado ?? "",
    pais: extra.local?.pais ?? "",
    fuso: extra.fuso ?? "",
    idioma: extra.idioma ?? "",
    sistema,
    navegador,
    tema: extra.tema ?? "",
    visitante: extra.visitante ?? "",
    n_pagina: String(extra.n ?? 1),
  };
}

function rastreioPermitido() {
  return coletaAtiva && navigator.doNotTrack !== "1" && !["localhost", "127.0.0.1"].includes(location.hostname);
}

let localPromessa: Promise<Local | null> | null = null;

/** Cidade/UF aproximadas pelo próprio servidor do site (Vercel), que lê a rede e devolve só a cidade: o IP não é guardado. */
function localAproximado(): Promise<Local | null> {
  if (localPromessa) return localPromessa;
  localPromessa = (async () => {
    try {
      const salvo = sessionStorage.getItem(LOCAL);
      if (salvo) return JSON.parse(salvo) as Local;
    } catch {}
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const r = await fetch("/api/geo", { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(t);
      if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) return null;
      const j = (await r.json()) as Partial<Local>;
      const l = { cidade: String(j.cidade ?? "").slice(0, 60), estado: String(j.estado ?? "").slice(0, 10), pais: String(j.pais ?? "").slice(0, 4) };
      try { sessionStorage.setItem(LOCAL, JSON.stringify(l)); } catch {}
      return l;
    } catch {
      return null;
    }
  })();
  return localPromessa;
}

function sessaoAtual(contar: boolean): { sessao: string; n: number; visitante: string } | null {
  try {
    let sessao = sessionStorage.getItem(SESSAO);
    let visitante = "recorrente";
    if (!sessao) {
      sessao = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(SESSAO, sessao);
      try {
        if (!localStorage.getItem(VISITOU)) { visitante = "novo"; localStorage.setItem(VISITOU, "1"); }
      } catch { visitante = ""; }
      sessionStorage.setItem("md:visitante", visitante);
    } else {
      visitante = sessionStorage.getItem("md:visitante") ?? "recorrente";
    }
    const n = Number(sessionStorage.getItem(CONTADOR) ?? "0") + (contar ? 1 : 0);
    if (contar) sessionStorage.setItem(CONTADOR, String(n));
    return { sessao, n, visitante };
  } catch {
    return null; // armazenamento bloqueado: não registra, para não contar a mesma visita várias vezes
  }
}

async function registrar(evento: string, detalhe = "") {
  const s = sessaoAtual(evento === "pagina");
  if (!s) return;
  const local = await localAproximado();
  let fuso = "";
  try { fuso = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""; } catch {}
  const primeira = evento === "pagina" && s.n === 1;
  const dados = dadosAcesso(location, primeira ? document.referrer : "", window.innerWidth, s.sessao, {
    titulo: document.title, ua: navigator.userAgent, idioma: navigator.language, fuso, local,
    tema: document.documentElement.getAttribute("data-theme") === "dark" ? "escuro" : "claro", visitante: s.visitante, n: s.n, evento,
  });
  // a primeira página guarda a origem real; as seguintes contam como navegação interna
  if (!primeira) { dados.referencia = "interno"; dados.canal = "Interno"; }
  else { try { sessionStorage.setItem("md:canal", dados.canal); } catch {} }
  void enviar("acesso", { ...dados, detalhe: detalhe.slice(0, 120) });
}

/** Cidade/UF aproximadas e canal de chegada, para acompanhar cadastros e contatos (mesmas regras dos acessos). */
export async function contextoColeta(): Promise<{ cidade: string; estado: string; canal: string }> {
  if (typeof window === "undefined" || !rastreioPermitido()) return { cidade: "", estado: "", canal: "" };
  const l = await localAproximado();
  let c = "";
  try { c = sessionStorage.getItem("md:canal") ?? ""; } catch {}
  return { cidade: l?.cidade ?? "", estado: l?.estado ?? "", canal: c };
}

/**
 * Registra o uso de um recurso (exportar, favoritar, compartilhar). Só o nome do recurso e um detalhe curto
 * (ex.: "deputados · csv"), nunca dados digitados.
 */
export function registrarEvento(evento: string, detalhe = "") {
  if (typeof window === "undefined" || !rastreioPermitido()) return;
  void registrar(evento, detalhe);
}

/**
 * Registra cada página vista na planilha de acessos (a primeira da visita guarda a origem).
 * Sem cookies, sem IP, sem texto digitado. Respeita o "Não rastrear" do navegador e não conta em localhost.
 */
export function Acessos() {
  const caminho = usePathname();
  useEffect(() => {
    if (!rastreioPermitido()) return;
    // espera o título da página nova (o nome do deputado vem dele)
    const t = setTimeout(() => void registrar("pagina"), 600);
    return () => clearTimeout(t);
  }, [caminho]);
  return null;
}
