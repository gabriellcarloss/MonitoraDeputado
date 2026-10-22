import Link from "next/link";
import { Nav } from "./Nav";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ busca }: { busca?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="faixa-brasil h-1" aria-hidden />
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center gap-3 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-verde text-sm text-white" aria-hidden>
              MD
            </span>
            <span className="text-lg">
              Monitora<span className="text-destaque">Deputado</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {busca}
            <ThemeToggle />
          </div>
        </div>
        <Nav />
      </div>
    </header>
  );
}
