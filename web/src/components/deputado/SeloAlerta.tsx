import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { brl } from "@/lib/format";
import type { Alerta, Severidade } from "@/lib/types";

export const RODAPE = "Ponto de atenção gerado automaticamente a partir de dados públicos. Não constitui acusação.";

export const SEVERIDADE: Record<Severidade, { rotulo: string; Icone: typeof Info; cls: string }> = {
  alta: { rotulo: "Alta", Icone: AlertOctagon, cls: "border-alta/40 bg-alta/10 text-alta" },
  atencao: { rotulo: "Atenção", Icone: AlertTriangle, cls: "border-atencao/50 bg-atencao/15 text-fg" },
  info: { rotulo: "Informativo", Icone: Info, cls: "border-info/40 bg-info/10 text-info" },
};

export function BadgeSeveridade({ s }: { s: Severidade }) {
  const { rotulo, Icone, cls } = SEVERIDADE[s];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      <Icone size={12} aria-hidden /> {rotulo}
    </span>
  );
}

function LinkEvidencia({ url, children }: { url: string; children: React.ReactNode }) {
  const cls = "text-destaque underline underline-offset-2";
  return url.startsWith("/") ? <Link href={url} className={cls}>{children}</Link>
    : <a href={url} className={cls} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export function SeloAlerta({ alerta, compacto = false }: { alerta: Alerta; compacto?: boolean }) {
  return (
    <article className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <BadgeSeveridade s={alerta.severidade} />
        <span className="text-xs text-muted">{alerta.regra}</span>
        <h3 className="w-full text-sm font-semibold sm:w-auto">{alerta.titulo}</h3>
      </div>
      <p className="mt-1 text-sm">{alerta.descricao}</p>
      {!compacto && alerta.evidencias.length ? (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted">Evidências ({alerta.evidencias.length})</summary>
          <ul className="mt-1 space-y-1">
            {alerta.evidencias.map((e, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                {e.url ? <LinkEvidencia url={e.url}>{e.ref}</LinkEvidencia> : <span>{e.ref}</span>}
                {e.valor !== null && e.tipo !== "indicador" ? <span className="num text-muted">{brl(e.valor)}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="mt-2 text-xs text-muted">{RODAPE}</p>
    </article>
  );
}
