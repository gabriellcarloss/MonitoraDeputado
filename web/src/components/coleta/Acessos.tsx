"use client";

import { useEffect } from "react";
import { coletaAtiva, enviar } from "@/lib/coleta";

const CHAVE = "md:sessao";

/** Dados de um acesso, sem nada que identifique a pessoa: só a página, o site de origem (domínio), as utm e o tipo de aparelho. */
export function dadosAcesso(loc: Pick<Location, "pathname" | "search">, referrer: string, largura: number, sessao: string) {
  const q = new URLSearchParams(loc.search);
  let ref = "direto";
  try { ref = referrer ? new URL(referrer).hostname : "direto"; } catch {}
  return {
    pagina: loc.pathname,
    referencia: ref,
    utm_source: q.get("utm_source") ?? "",
    utm_medium: q.get("utm_medium") ?? "",
    utm_campaign: q.get("utm_campaign") ?? "",
    dispositivo: largura < 768 ? "celular" : largura < 1100 ? "tablet" : "computador",
    sessao,
  };
}

/**
 * Registra uma linha por visita (a página de entrada) na planilha de acessos.
 * Sem cookies, sem IP, sem texto digitado. Respeita o "Não rastrear" do navegador e não conta em localhost.
 */
export function Acessos() {
  useEffect(() => {
    if (!coletaAtiva) return;
    if (navigator.doNotTrack === "1" || location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
    try {
      if (sessionStorage.getItem(CHAVE)) return;
      const sessao = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(CHAVE, sessao);
      void enviar("acesso", dadosAcesso(location, document.referrer, window.innerWidth, sessao));
    } catch {
      // armazenamento bloqueado: não registra, para não contar a mesma visita várias vezes
    }
  }, []);
  return null;
}
