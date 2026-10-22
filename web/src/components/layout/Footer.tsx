import Link from "next/link";
import { data } from "@/lib/format";

export function Footer({ geradoEm }: { geradoEm?: string | null }) {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:justify-between">
        <p>
          Dados públicos da Câmara dos Deputados e da Receita Federal.{" "}
          {geradoEm ? <>Última atualização: {data(geradoEm)}.</> : null}
        </p>
        <p>
          <Link href="/sobre/" className="text-destaque underline">Metodologia e fontes</Link> · Código aberto
        </p>
      </div>
    </footer>
  );
}
