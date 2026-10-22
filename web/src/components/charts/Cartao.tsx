"use client";

import { Table2 } from "lucide-react";
import { useState } from "react";

/** Card de gráfico com título, subtítulo e alternância para a tabela de dados. */
export function Cartao({ titulo, subtitulo, tabela, children, acoes }: {
  titulo: string; subtitulo?: string; tabela?: React.ReactNode; children: React.ReactNode; acoes?: React.ReactNode;
}) {
  const [verTabela, setVerTabela] = useState(false);
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{titulo}</h2>
          {subtitulo ? <p className="text-sm text-muted">{subtitulo}</p> : null}
        </div>
        {acoes}
        {tabela ? (
          <button type="button" onClick={() => setVerTabela((v) => !v)} aria-pressed={verTabela}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-fg">
            <Table2 size={14} aria-hidden /> {verTabela ? "Ver gráfico" : "Ver tabela"}
          </button>
        ) : null}
      </div>
      {verTabela ? <div className="max-h-96 overflow-auto">{tabela}</div> : children}
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
