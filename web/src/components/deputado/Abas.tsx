"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useAba<T extends string>(abas: readonly T[]): [T, (a: T) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const pedida = sp?.get("aba") as T | null;
  const atual = pedida && abas.includes(pedida) ? pedida : abas[0];
  return [atual, (a: T) => router.replace(`${path}?aba=${a}`, { scroll: false })];
}

export function Abas<T extends string>({ abas, rotulos, atual, onChange }: {
  abas: readonly T[]; rotulos: Record<T, string>; atual: T; onChange: (a: T) => void;
}) {
  return (
    <div role="tablist" aria-label="Seções do perfil" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
      {abas.map((a) => (
        <button key={a} role="tab" type="button" aria-selected={a === atual} onClick={() => onChange(a)}
          aria-pressed={a === atual} className="pilula whitespace-nowrap">
          {rotulos[a]}
        </button>
      ))}
    </div>
  );
}
