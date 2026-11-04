import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { brl, humanizar } from "@/lib/format";
import type { Alerta, Severidade } from "@/lib/types";

export const RODAPE = "Ponto de atenção gerado automaticamente a partir de dados públicos. Não constitui acusação.";

export const SEVERIDADE: Record<Severidade, { rotulo: string; Icone: typeof Info; cls: string; faixa: string; tinta: string; icone: string }> = {
  alta: { rotulo: "Alta", Icone: AlertOctagon, cls: "border-alta/40 bg-alta/10 text-alta", faixa: "bg-alta", tinta: "from-alta/[0.09]", icone: "bg-alta text-white" },
  atencao: { rotulo: "Atenção", Icone: AlertTriangle, cls: "border-atencao/50 bg-atencao/15 text-fg", faixa: "bg-atencao", tinta: "from-atencao/[0.10]", icone: "bg-atencao text-[#3a2a00]" },
  info: { rotulo: "Informativo", Icone: Info, cls: "border-info/40 bg-info/10 text-info", faixa: "bg-info", tinta: "from-info/[0.09]", icone: "bg-info text-white" },
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
  const sv = SEVERIDADE[alerta.severidade];
  return (
    <article className={`cartao relative overflow-hidden bg-gradient-to-br ${sv.tinta} to-transparent p-4 pl-5`} data-revelar data-tilt="3">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${sv.faixa}`} />
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-sm ${sv.icone}`}><sv.Icone size={20} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <BadgeSeveridade s={alerta.severidade} />
            <span className="num rounded-md bg-subtle px-1.5 py-0.5 text-[11px] font-semibold text-muted">{alerta.regra}</span>
          </div>
          <h3 className="mt-1 text-base font-bold leading-snug">{humanizar(alerta.titulo)}</h3>
          <p className="mt-0.5 text-sm">{humanizar(alerta.descricao)}</p>
        </div>
      </div>
      {!compacto && alerta.evidencias.length ? (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-semibold text-destaque">Evidências ({alerta.evidencias.length})</summary>
          <ul className="mt-2 space-y-1 rounded-lg bg-subtle/70 p-2.5">
            {alerta.evidencias.map((e, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                {e.url ? <LinkEvidencia url={e.url}>{humanizar(e.ref)}</LinkEvidencia> : <span>{humanizar(e.ref)}</span>}
                {e.valor !== null && e.tipo !== "indicador" ? <span className="num text-muted">{brl(e.valor)}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="mt-3 text-[11px] text-muted">{RODAPE}</p>
    </article>
  );
}
