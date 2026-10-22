import Link from "next/link";
import { Foto } from "./Foto";

export interface ItemRanking {
  id: number;
  nome: string;
  partido: string;
  uf: string;
  foto?: string | null;
  valor: string;
}

export function Ranking({ titulo, itens, inicio = 1 }: { titulo: string; itens: ItemRanking[]; inicio?: number }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-2 text-base font-semibold">{titulo}</h2>
      {itens.length === 0 ? <p className="text-sm text-muted">Sem registros no período.</p> : (
        <ol className="space-y-1.5">
          {itens.map((i, k) => (
            <li key={i.id} className="flex items-center gap-2 text-sm">
              <span className="num w-6 text-right text-muted">{inicio + k}</span>
              <Foto src={i.foto ?? null} nome={i.nome} tamanho={28} />
              <Link href={`/deputado/${i.id}/`} className="min-w-0 flex-1 truncate hover:underline">
                {i.nome} <span className="text-muted">({i.partido}-{i.uf})</span>
              </Link>
              <span className="num font-medium">{i.valor}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
