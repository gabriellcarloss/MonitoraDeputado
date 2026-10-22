export function StatTile({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted">{rotulo}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{valor}</p>
      {detalhe ? <p className="mt-1 text-xs text-muted">{detalhe}</p> : null}
    </div>
  );
}

export function Carregando({ texto = "Carregando dados…" }: { texto?: string }) {
  return <p className="py-8 text-center text-sm text-muted" role="status">{texto}</p>;
}

export function Erro({ texto }: { texto: string }) {
  return <p className="rounded-lg border border-alta/40 bg-alta/10 p-3 text-sm" role="alert">Não foi possível carregar os dados: {texto}</p>;
}

export function Titulo({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{children}</h1>
      {sub ? <p className="mt-1 max-w-3xl text-muted">{sub}</p> : null}
    </div>
  );
}
