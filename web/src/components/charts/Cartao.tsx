"use client";

import { Table2 } from "lucide-react";
import { useRef, useState } from "react";
import { Exportar } from "@/components/ui/Exportar";
import type { Tabela } from "@/lib/exportar";

/** Card de gráfico com título, subtítulo e alternância para a tabela de dados. */
export function Cartao({ titulo, subtitulo, tabela, children, acoes, dados, imagem = true }: {
  titulo: string; subtitulo?: string; tabela?: React.ReactNode; children: React.ReactNode; acoes?: React.ReactNode;
  /** Dados brutos do gráfico, para baixar em Excel/CSV/JSON. */
  dados?: Tabela;
  /** Oferece baixar o gráfico como imagem PNG. */
  imagem?: boolean;
}) {
  const [verTabela, setVerTabela] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  return (
    <section className="cartao p-4" data-revelar>
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl leading-none">{titulo}</h2>
          {subtitulo ? <p className="mt-1 text-sm text-muted">{subtitulo}</p> : null}
        </div>
        {acoes}
        {tabela ? (
          <button type="button" onClick={() => setVerTabela((v) => !v)} aria-pressed={verTabela}
            className="pilula h-7 px-2.5 text-xs">
            <Table2 size={14} aria-hidden /> {verTabela ? "Ver gráfico" : "Ver tabela"}
          </button>
        ) : null}
        <Exportar nome={titulo} compacto obter={dados ? () => dados : undefined} grafico={imagem && !verTabela ? area : undefined} />
      </div>
      <div ref={area}>{verTabela ? <div className="max-h-96 overflow-auto">{tabela}</div> : children}</div>
    </section>
  );
}

export function TabelaSimples({ colunas, linhas }: { colunas: string[]; linhas: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-card text-left text-muted">
        <tr>{colunas.map((c) => <th key={c} className="py-1 pr-3 font-medium">{c}</th>)}</tr>
      </thead>
      <tbody className="num">
        {linhas.map((l, i) => (
          <tr key={i} className="border-t border-border">
            {l.map((v, j) => <td key={j} className="py-1 pr-3">{v}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
