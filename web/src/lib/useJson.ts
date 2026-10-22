"use client";

import { useEffect, useState } from "react";

const cache = new Map<string, Promise<unknown>>();

export function carregarJson<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ao carregar ${url}`);
      return r.json();
    }));
  }
  return cache.get(url) as Promise<T>;
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
