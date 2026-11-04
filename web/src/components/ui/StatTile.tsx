import clsx from "clsx";

const PONTOS = { verde: "bg-verde", amarelo: "bg-amarelo", azul: "bg-info", vermelho: "bg-alta", laranja: "bg-atencao" } as const;
export type CorPonto = keyof typeof PONTOS;

export function StatTile({ rotulo, valor, detalhe, cor = "verde", barra }: {
  rotulo: string; valor: React.ReactNode; detalhe?: string; cor?: CorPonto; barra?: number;
}) {
  return (
    <div className="cartao brilho-varre h-full p-4" data-revelar data-tilt="8">
      <span aria-hidden className={clsx("pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.12] blur-xl", PONTOS[cor])} />
      <p className="profundo flex items-center gap-2 text-xs font-semibold text-muted">
        <span aria-hidden className={clsx("h-2 w-2 rounded-full", PONTOS[cor], cor === "verde" && "pulso-vivo")} /> {rotulo}
      </p>
      <p className="num-display profundo mt-1 text-3xl leading-tight sm:text-[2.1rem]">{valor}</p>
      {detalhe ? <p className="mt-0.5 text-xs text-muted">{detalhe}</p> : null}
      {barra !== undefined ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden>
          <div className={clsx("crescer-x h-full rounded-full", PONTOS[cor])} style={{ width: `${Math.max(0, Math.min(1, barra)) * 100}%` }} />
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
      {sobretitulo ? <p className="subir mb-1 text-xs font-semibold text-destaque">{sobretitulo}</p> : null}
      <h1 className="font-display subir text-3xl leading-none sm:text-[2.6rem]">{children}</h1>
      <div className="faixa-viva mt-3 w-24" aria-hidden />
      {sub ? <p className="subir mt-3 max-w-3xl text-muted" style={{ ["--i" as string]: 2 }}>{sub}</p> : null}
    </div>
  );
}

export function Secao({ titulo, sub, children, acao }: { titulo: string; sub?: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1" data-revelar>
        <h2 className="font-display flex items-center gap-2 text-2xl leading-none">
          <span aria-hidden className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#009c3b] via-[#ffdf00] to-[#002776]" />{titulo}
        </h2>
        {sub ? <p className="text-sm text-muted">{sub}</p> : null}
        {acao ? <div className="ml-auto">{acao}</div> : null}
      </div>
      {children}
    </section>
  );
}
