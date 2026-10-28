"use client";

import { useEffect, useState } from "react";
import { EVENTO_DADOS, type EstadoDados } from "@/lib/resiliencia";

/** Faixa discreta quando o que está na tela veio da cópia guardada na última visita. */
export function AvisoDados() {
  const [antigo, setAntigo] = useState(false);
  useEffect(() => {
    const ouvir = (e: Event) => setAntigo((e as CustomEvent<EstadoDados>).detail === "desatualizado");
    window.addEventListener(EVENTO_DADOS, ouvir);
    return () => window.removeEventListener(EVENTO_DADOS, ouvir);
  }, []);
  if (!antigo) return null;
  return (
    <div role="status" className="border-b border-border bg-card px-4 py-2 text-center text-xs text-muted">
      Mostrando dados salvos da sua última visita; podem estar desatualizados.
    </div>
  );
}
