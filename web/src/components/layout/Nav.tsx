"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const ROTAS = [
  { href: "/", rotulo: "Início" },
  { href: "/deputados/", rotulo: "Deputados" },
  { href: "/gastos/", rotulo: "Gastos" },
  { href: "/votacoes/", rotulo: "Votações" },
  { href: "/presenca/", rotulo: "Presença" },
  { href: "/proposicoes/", rotulo: "Proposições" },
  { href: "/alertas/", rotulo: "Alertas" },
  { href: "/rede/", rotulo: "Rede" },
  { href: "/sobre/", rotulo: "Sobre os dados" },
];

export function Nav() {
  const atual = usePathname() || "/";
  return (
    <nav aria-label="Principal" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 whitespace-nowrap text-sm">
        {ROTAS.map((r) => {
          const ativo = r.href === "/" ? atual === "/" : atual.startsWith(r.href.replace(/\/$/, ""));
          return (
            <li key={r.href}>
              <Link
                href={r.href}
                aria-current={ativo ? "page" : undefined}
                className={clsx(
                  "inline-block rounded-md px-3 py-2 font-medium",
                  ativo ? "bg-verde/10 text-destaque" : "text-muted hover:bg-subtle hover:text-fg",
                )}
              >
                {r.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
