"use client";

import clsx from "clsx";
import { Star } from "lucide-react";
import { useFavoritos } from "@/lib/favoritos";

/** Estrela para marcar "meu deputado". `rotulo` mostra o texto ao lado (perfil); sem ele, só o ícone (listas). */
export function BotaoFavorito({ id, nome, rotulo = false, className }: { id: number; nome: string; rotulo?: boolean; className?: string }) {
  const { tem, alternar, pronto } = useFavoritos();
  const marcado = pronto && tem(id);
  const texto = marcado ? `Remover ${nome} dos meus deputados` : `Marcar ${nome} como meu deputado`;
  return (
    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); alternar(id); }}
      aria-pressed={marcado} aria-label={texto} title={texto}
      className={clsx("inline-flex items-center gap-1.5 rounded-md transition",
        rotulo ? "pilula" : "p-1 hover:bg-subtle", marcado ? "text-[#b58900] dark:text-[#ffdf00]" : "text-muted hover:text-fg", className)}>
      <Star size={rotulo ? 16 : 18} aria-hidden fill={marcado ? "currentColor" : "none"} />
      {rotulo ? <span>{marcado ? "Meu deputado" : "Marcar como meu deputado"}</span> : null}
    </button>
  );
}
