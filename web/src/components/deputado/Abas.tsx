"use client";

import clsx from "clsx";
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
    <div role="tablist" aria-label="Seções do perfil" className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-border px-4">
      {abas.map((a) => (
        <button key={a} role="tab" type="button" aria-selected={a === atual} onClick={() => onChange(a)}
          className={clsx("whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
            a === atual ? "border-verde text-fg" : "border-transparent text-muted hover:text-fg")}>
          {rotulos[a]}
        </button>
      ))}
    </div>
  );
}
