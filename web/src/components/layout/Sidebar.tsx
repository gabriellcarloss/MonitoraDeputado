"use client";

import clsx from "clsx";
import {
  AlertTriangle, BarChart3, BookOpen, ExternalLink, FileText, Landmark, LayoutDashboard, Menu, Network, Plane, Share2,
  Mail, UserCheck, UserRound, Users, Vote, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTOR } from "@/lib/site";
import { BuscaGlobal } from "./BuscaGlobal";
import { ThemeToggle } from "./ThemeToggle";

export const ROTAS = [
  { href: "/", rotulo: "Visão geral", Icone: LayoutDashboard },
  { href: "/deputados/", rotulo: "Deputados", Icone: Users },
  { href: "/gastos/", rotulo: "Gastos", Icone: BarChart3 },
  { href: "/gastos/passagens/", rotulo: "Passagens", Icone: Plane },
  { href: "/votacoes/", rotulo: "Votações", Icone: Vote },
  { href: "/presenca/", rotulo: "Presença", Icone: UserCheck },
  { href: "/proposicoes/", rotulo: "Proposições", Icone: FileText },
  { href: "/alertas/", rotulo: "Alertas", Icone: AlertTriangle },
  { href: "/rede/", rotulo: "Rede", Icone: Network },
];

function ativo(atual: string, href: string) {
  if (href === "/") return atual === "/";
  if (href === "/gastos/") return atual.startsWith("/gastos") && !atual.startsWith("/gastos/passagens") || atual.startsWith("/fornecedor");
  if (href === "/deputados/") return atual.startsWith("/deputado");
  return atual.startsWith(href.replace(/\/$/, ""));
}

function Marca() {
  return (
    <Link href="/" className="flex items-center gap-3 px-4 py-5">
      <span aria-hidden className="relative grid h-10 w-10 shrink-0 place-items-center">
        <span className="absolute inset-0 rotate-45 rounded-md bg-[#ffdf00]" />
        <span className="relative h-5 w-5 rounded-full border-2 border-white bg-[#002776]" />
      </span>
      <span className="border-l border-white/40 pl-3 leading-none">
        <span className="font-display block text-[22px] uppercase tracking-wide text-white">Monitora</span>
        <span className="font-display block text-[22px] uppercase tracking-wide text-[#ffdf00]">Deputado</span>
        <span className="mt-1 block text-[10px] font-medium uppercase tracking-wider text-white/75">Fiscalização cidadã</span>
      </span>
    </Link>
  );
}

function Itens({ onNavegar }: { onNavegar?: () => void }) {
  const atual = usePathname() || "/";
  const [copiado, setCopiado] = useState(false);
  async function compartilhar() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 1800); }
    } catch {}
  }
  return (
    <>
      <BuscaGlobal onNavegar={onNavegar} />
      <nav aria-label="Principal" className="px-3">
        <ul className="space-y-1">
          {ROTAS.map(({ href, rotulo, Icone }) => {
            const a = ativo(atual, href);
            return (
              <li key={href}>
                <Link href={href} onClick={onNavegar} aria-current={a ? "page" : undefined}
                  className={clsx("group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
                    a ? "bg-white/15 text-white" : "text-white/85 hover:bg-white/10 hover:text-white")}>
                  {a ? <span aria-hidden className="absolute -left-3 top-1 bottom-1 w-1 rounded-r bg-[#ffdf00]" /> : null}
                  <Icone size={18} aria-hidden /> {rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="mt-6 px-6 text-[11px] font-bold uppercase tracking-widest text-white/50">Atalhos</p>
      <div className="mt-2 space-y-1 px-3">
        <Link href="/sobre/" onClick={onNavegar} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
          <BookOpen size={18} aria-hidden /> Metodologia
        </Link>
        <Link href="/contato/" onClick={onNavegar} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
          <Mail size={18} aria-hidden /> Contato
        </Link>
        <button type="button" onClick={compartilhar} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
          <Share2 size={18} aria-hidden /> {copiado ? "Link copiado!" : "Compartilhar"}
        </button>
        <ThemeToggle />
      </div>
      <p className="mt-6 px-6 text-[11px] font-bold uppercase tracking-widest text-white/50">Quem fez</p>
      <div className="mt-2 space-y-1 px-3">
        <a href={AUTOR.apuracao} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white">
          <ExternalLink size={18} aria-hidden /> Apuração Eleições 2026
        </a>
      </div>
    </>
  );
}

export function Sidebar() {
  const [aberto, setAberto] = useState(false);
  const atual = usePathname();
  useEffect(() => setAberto(false), [atual]);
  return (
    <>
      <aside className="sidebar-brasil fixed inset-y-0 left-0 z-40 hidden w-60 flex-col lg:flex">
        <span aria-hidden className="faixa-bandeira absolute inset-y-0 right-0 w-1" />
        <Marca />
        <div className="flex-1 overflow-y-auto pb-6"><Itens /></div>
        <p className="flex items-center gap-2 px-5 pb-4 text-[11px] text-white/50"><Landmark size={12} aria-hidden /> Fonte: Câmara, Receita Federal</p>
      </aside>
      <header className="sidebar-brasil sticky top-0 z-40 flex items-center justify-between pr-2 lg:hidden">
        <span aria-hidden className="faixa-bandeira-h absolute inset-x-0 bottom-0 h-1" />
        <Marca />
        <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} aria-label="Abrir menu"
          className="rounded-lg p-2 text-white hover:bg-white/10">{aberto ? <X /> : <Menu />}</button>
      </header>
      {aberto ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/60" onClick={() => setAberto(false)} />
          <div className="sidebar-brasil absolute inset-y-0 left-0 w-72 overflow-y-auto pb-6">
            <Marca />
            <Itens onNavegar={() => setAberto(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
