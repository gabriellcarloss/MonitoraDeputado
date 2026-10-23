"use client";
/**
 * "Meus deputados": lista pessoal guardada só neste navegador (localStorage).
 * Nada é enviado a servidor algum — o voto é secreto e a lista também.
 */
import { useCallback, useEffect, useState } from "react";

const CHAVE = "md:favoritos";
const EVENTO = "md:favoritos";
export const MAX_FAVORITOS = 60;

/** Lista de ids vinda da URL (?lista=1,2,3) ou do armazenamento: só inteiros positivos, sem repetição. */
export function parseIds(v: unknown, max = MAX_FAVORITOS): number[] {
  const brutos = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  const ids: number[] = [];
  for (const x of brutos) {
    const n = Number(x);
    if (Number.isInteger(n) && n > 0 && !ids.includes(n)) ids.push(n);
    if (ids.length >= max) break;
  }
  return ids;
}

export function lerFavoritos(): number[] {
  try {
    return parseIds(JSON.parse(localStorage.getItem(CHAVE) ?? "[]"));
  } catch {
    return [];
  }
}

function gravar(ids: number[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(parseIds(ids)));
  } catch {
    // navegação privada ou armazenamento bloqueado: a lista vale só até fechar a página
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function useFavoritos() {
  const [ids, setIds] = useState<number[]>([]);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const atualizar = () => setIds(lerFavoritos());
    atualizar();
    setPronto(true);
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener("storage", atualizar); // outras abas
    return () => {
      window.removeEventListener(EVENTO, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  const alternar = useCallback((id: number) => {
    const atual = lerFavoritos();
    gravar(atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]);
  }, []);
  const definir = useCallback((novos: number[]) => gravar(novos), []);
  return { ids, pronto, tem: (id: number) => ids.includes(id), alternar, definir };
}

/** Link para mostrar a lista a outra pessoa (só leitura; ela decide se salva). */
export function linkLista(ids: number[]): string {
  return `/deputados/?lista=${ids.join(",")}`;
}
