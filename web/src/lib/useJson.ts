"use client";

import { useEffect, useState } from "react";
import { buscarJson } from "./resiliencia";

const cache = new Map<string, Promise<unknown>>();

/**
 * Carrega um JSON publicado em /data, com novas tentativas e, se a rede falhar, a cópia guardada da última visita.
 * Fica em memória enquanto a página estiver aberta; uma falha não fica guardada (a próxima chamada tenta de novo).
 */
export function carregarJson<T>(url: string): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined;
  if (!p) {
    p = buscarJson<T>(url);
    cache.set(url, p);
    const q = p;
    q.catch(() => {
      if (cache.get(url) === q) cache.delete(url);
    });
  }
  return p;
}

/** Carrega um JSON publicado em /data (com cache em memória). */
export function useJson<T>(url: string | null) {
  const [estado, setEstado] = useState<{ dados: T | null; erro: string | null }>({ dados: null, erro: null });
  useEffect(() => {
    if (!url) return;
    let vivo = true;
    carregarJson<T>(url)
      .then((dados) => vivo && setEstado({ dados, erro: null }))
      .catch((e: Error) => vivo && setEstado({ dados: null, erro: e.message }));
    return () => { vivo = false; };
  }, [url]);
  return estado;
}
