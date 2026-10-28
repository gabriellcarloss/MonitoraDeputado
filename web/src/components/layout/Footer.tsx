import { ExternalLink } from "lucide-react";
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
            <a href={AUTOR.apuracao} target="_blank" rel="noopener noreferrer" className="pilula">
              <ExternalLink size={16} aria-hidden /> Apuração Eleições 2026
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
