import { ExternalLink, MessageCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { data } from "@/lib/format";
import { AUTOR } from "@/lib/site";

export function Footer({ geradoEm }: { geradoEm?: string | null }) {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-muted">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <p>
            Dados públicos da Câmara dos Deputados, do Portal da Transparência e da Receita Federal.{" "}
            {geradoEm ? <>Última atualização: {data(geradoEm)}.</> : null}
          </p>
          <p>
            <Link href="/sobre/" className="text-destaque underline">Metodologia e fontes</Link> ·{" "}
            <Link href="/contato/" className="text-destaque underline">Contato</Link> ·{" "}
            <Link href="/privacidade/" className="text-destaque underline">Privacidade</Link> ·{" "}
            <a href="https://github.com/gabriellcarloss/MonitoraDeputado" target="_blank" rel="noopener noreferrer" className="text-destaque underline">Código aberto</a>
          </p>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p>Desenvolvimento de <strong className="text-fg">{AUTOR.nome}</strong></p>
          <div className="flex flex-wrap gap-2">
            <a href={AUTOR.whatsapp} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#25d366] px-3 py-1.5 text-sm font-bold text-[#0b3d1f] hover:brightness-110">
              <MessageCircle size={16} aria-hidden /> WhatsApp
            </a>
            <a href={AUTOR.linkedin} target="_blank" rel="noopener noreferrer" className="pilula">
              <UserRound size={16} aria-hidden /> LinkedIn
            </a>
            <a href={AUTOR.apuracao} target="_blank" rel="noopener noreferrer" className="pilula">
              <ExternalLink size={16} aria-hidden /> Apuração Eleições 2026
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
