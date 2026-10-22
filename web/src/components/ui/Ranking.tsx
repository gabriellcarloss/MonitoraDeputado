import Link from "next/link";
import { Foto } from "./Foto";

export interface ItemRanking {
  id: number;
  nome: string;
  partido: string;
  uf: string;
  foto?: string | null;
  valor: string;
  /** 0–1: largura da barra relativa ao primeiro da lista. */
  proporcao?: number;
}

export function Ranking({ titulo, itens, inicio = 1, cor = "bg-verde" }: { titulo: string; itens: ItemRanking[]; inicio?: number; cor?: string }) {
  return (
    <section className="cartao p-4">
      <h2 className="font-display mb-3 text-xl leading-none">{titulo}</h2>
      {itens.length === 0 ? <p className="text-sm text-muted">Sem registros no período.</p> : (
        <ol className="space-y-2">
          {itens.map((i, k) => (
            <li key={i.id}>
              <Link href={`/deputado/${i.id}/`} className="group flex items-center gap-2 rounded-lg p-1.5 text-sm transition hover:bg-subtle">
                <span className="num-display w-5 text-center text-base text-muted">{inicio + k}</span>
                <Foto src={i.foto ?? null} nome={i.nome} tamanho={30} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate font-semibold group-hover:underline">{i.nome}</span>
                    <span className="shrink-0 text-xs text-muted">{i.partido}-{i.uf}</span>
                    <span className="num-display ml-auto shrink-0 text-base">{i.valor}</span>
                  </span>
                  {i.proporcao !== undefined ? (
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-subtle" aria-hidden>
                      <span className={`block h-full rounded-full ${cor}`} style={{ width: `${Math.max(2, i.proporcao * 100)}%` }} />
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
