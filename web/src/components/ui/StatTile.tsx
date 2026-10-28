import clsx from "clsx";

const PONTOS = { verde: "bg-verde", amarelo: "bg-amarelo", azul: "bg-info", vermelho: "bg-alta", laranja: "bg-atencao" } as const;
export type CorPonto = keyof typeof PONTOS;

export function StatTile({ rotulo, valor, detalhe, cor = "verde", barra }: {
  rotulo: string; valor: React.ReactNode; detalhe?: string; cor?: CorPonto; barra?: number;
}) {
  return (
    <div className="cartao brilho-hover h-full p-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted">
        <span aria-hidden className={clsx("h-1.5 w-1.5 rounded-full", PONTOS[cor])} /> {rotulo}
      </p>
      <p className="num-display mt-1 text-3xl leading-tight sm:text-[2rem]">{valor}</p>
      {detalhe ? <p className="mt-0.5 text-xs text-muted">{detalhe}</p> : null}
      {barra !== undefined ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-subtle" aria-hidden>
          <div className={clsx("h-full rounded-full", PONTOS[cor])} style={{ width: `${Math.max(0, Math.min(1, barra)) * 100}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function Carregando({ texto = "Carregando dados…" }: { texto?: string }) {
  return (
    <div className="py-8 text-center text-sm text-muted" role="status">
      <span className="mr-2 inline-block h-3 w-3 animate-ping rounded-full bg-verde align-middle" aria-hidden />{texto}
    </div>
  );
}

/**
 * Último recurso, só aparece depois de várias tentativas automáticas e sem nenhuma cópia guardada.
 * Sem texto técnico para quem visita (o detalhe vai para o console). `texto` é mantido por compatibilidade.
 */
export function Erro({ texto: _texto }: { texto?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted" role="status">
      Estes dados não carregaram agora. O site já tentou de novo sozinho.{" "}
      <a href="" className="font-semibold text-destaque underline">Recarregar a página</a>
    </div>
  );
}

export function Titulo({ children, sub, sobretitulo }: { children: React.ReactNode; sub?: React.ReactNode; sobretitulo?: string }) {
  return (
    <div className="mb-6">
      {sobretitulo ? <p className="mb-1 text-xs font-semibold text-destaque">{sobretitulo}</p> : null}
      <h1 className="font-display text-3xl leading-none sm:text-4xl">{children}</h1>
      {sub ? <p className="mt-2 max-w-3xl text-muted">{sub}</p> : null}
    </div>
  );
}

export function Secao({ titulo, sub, children, acao }: { titulo: string; sub?: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-2xl leading-none">{titulo}</h2>
        {sub ? <p className="text-sm text-muted">{sub}</p> : null}
        {acao ? <div className="ml-auto">{acao}</div> : null}
      </div>
      {children}
    </section>
  );
}
