"use client";

import { Braces, Download, FileSpreadsheet, FileText, ImageDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { registrarEvento } from "@/components/coleta/Acessos";
import { baixarGrafico, baixarTabela, type FormatoExportacao, rotuloFormato, type Tabela } from "@/lib/exportar";

const ICONES = { excel: FileSpreadsheet, csv: FileText, json: Braces, png: ImageDown };

/**
 * Botão "Baixar" com menu de formatos. `obter` devolve a tabela já com os filtros da tela (pode ser assíncrono,
 * por exemplo uma consulta DuckDB). `grafico` liga a opção PNG do gráfico que estiver dentro desse elemento.
 */
export function Exportar({ nome, obter, grafico, formatos = ["excel", "csv", "json"], compacto = false, rotulo = "Baixar" }: {
  nome: string;
  obter?: () => Tabela | Promise<Tabela>;
  grafico?: React.RefObject<HTMLElement | null>;
  formatos?: Exclude<FormatoExportacao, "png">[];
  compacto?: boolean;
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  const opcoes: FormatoExportacao[] = [...(obter ? formatos : []), ...(grafico ? ["png" as const] : [])];
  if (!opcoes.length) return null;

  async function escolher(f: FormatoExportacao) {
    setOcupado(true);
    try {
      if (f === "png") {
        if (grafico?.current) await baixarGrafico(grafico.current, nome);
      } else if (obter) {
        baixarTabela(await obter(), f, nome);
      }
      registrarEvento("exportar", `${nome} · ${f}`);
    } finally {
      setOcupado(false);
      setAberto(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setAberto((v) => !v)} aria-haspopup="menu" aria-expanded={aberto} disabled={ocupado}
        className={compacto ? "pilula h-7 px-2.5 text-xs" : "pilula"} title={`Baixar: ${nome}`} aria-label={`${rotulo}: ${nome}`}>
        <Download size={compacto ? 14 : 16} aria-hidden className={ocupado ? "animate-bounce" : undefined} />
        {ocupado ? "Gerando…" : rotulo}
      </button>
      {aberto ? (
        <div role="menu" aria-label={`Formatos para ${nome}`}
          className="subir absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-[0_20px_50px_-15px_rgb(0_0_0/0.35)]">
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold text-muted">Baixar {nome.toLowerCase()}</p>
          {opcoes.map((f, i) => {
            const Icone = ICONES[f];
            return (
              <button key={f} type="button" role="menuitem" onClick={() => void escolher(f)} style={{ ["--i" as string]: i }}
                className="subir flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-subtle">
                <Icone size={16} className="text-destaque" aria-hidden /> {rotuloFormato(f)}
              </button>
            );
          })}
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] leading-snug text-muted">Dados públicos. Com os filtros aplicados na tela.</p>
        </div>
      ) : null}
    </div>
  );
}
