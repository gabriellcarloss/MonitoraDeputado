"use client";

import { Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { consultar, useConsulta } from "@/lib/duck";
import type { Filtros } from "@/lib/filters";
import { brl, data, num } from "@/lib/format";
import { sqlContarNotas, sqlNotas } from "@/lib/queries/gastos";
import { Carregando, Erro } from "../ui/StatTile";

interface Nota {
  ide_documento: number; deputado_id: number; deputado: string; partido: string; uf: string; data: string | null;
  ano_mes: string; categoria: string; fornecedor: string; cnpj_cpf: string | null; passageiro: string | null;
  trecho: string | null; passageiro_e_deputado: boolean | null; valor_documento: number; valor_glosa: number;
  valor_liquido: number; url_documento: string | null;
}

const POR_PAGINA = 50;

function csv(linhas: Nota[]): string {
  const cols: (keyof Nota)[] = ["data", "ano_mes", "deputado", "partido", "uf", "categoria", "fornecedor", "cnpj_cpf",
    "passageiro", "trecho", "valor_documento", "valor_glosa", "valor_liquido", "url_documento"];
  const esc = (v: unknown) => (v === null || v === undefined ? "" : `"${String(v).replace(/"/g, '""')}"`);
  return [cols.join(";"), ...linhas.map((l) => cols.map((c) => esc(l[c])).join(";"))].join("\n");
}

/** Tabela de notas fiscais da cota com paginação, link para o documento original e exportação CSV. */
export function TabelaNotas({ filtros, mostrarDeputado = true }: { filtros: Filtros; mostrarDeputado?: boolean }) {
  const [pagina, setPagina] = useState(0);
  const chave = JSON.stringify(filtros);
  const [chaveAnterior, setChaveAnterior] = useState(chave);
  if (chave !== chaveAnterior) { setChaveAnterior(chave); setPagina(0); }
  const total = useConsulta<{ n: number; total: number }>(sqlContarNotas(filtros));
  const notas = useConsulta<Nota>(sqlNotas(filtros, POR_PAGINA, pagina * POR_PAGINA));
  const [baixando, setBaixando] = useState(false);
  const n = total.dados?.[0]?.n ?? 0;
  const paginas = Math.max(1, Math.ceil(n / POR_PAGINA));

  async function exportar() {
    setBaixando(true);
    try {
      const c = sqlNotas(filtros, 200000, 0);
      const linhas = await consultar<Nota>(c.sql, c.params);
      const url = URL.createObjectURL(new Blob(["﻿" + csv(linhas)], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "notas-cota-parlamentar.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBaixando(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex-1">
          <h2 className="text-base font-semibold">Notas fiscais</h2>
          <p className="text-sm text-muted">
            {total.dados ? `${num(n)} notas · ${brl(total.dados[0].total ?? 0)}` : "…"} — cada linha é um documento reembolsado pela cota.
          </p>
        </div>
        <button type="button" onClick={exportar} disabled={baixando || !n}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-subtle disabled:opacity-50">
          <Download size={14} aria-hidden /> {baixando ? "Gerando…" : "Exportar CSV"}
        </button>
      </div>
      {notas.erro ? <Erro texto={notas.erro} /> : !notas.dados ? <Carregando /> : notas.dados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nenhuma nota encontrada com esses filtros.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Data</th>
                {mostrarDeputado ? <th className="py-2 pr-3 font-medium">Deputado</th> : null}
                <th className="py-2 pr-3 font-medium">Categoria</th>
                <th className="py-2 pr-3 font-medium">Fornecedor</th>
                <th className="py-2 pr-3 font-medium">Passageiro / trecho</th>
                <th className="py-2 pr-3 text-right font-medium">Valor</th>
                <th className="py-2 pr-3 text-right font-medium">Glosa</th>
                <th className="py-2 font-medium"><span className="sr-only">Documento</span></th>
              </tr>
            </thead>
            <tbody className="num">
              {notas.dados.map((l) => (
                <tr key={`${l.ide_documento}-${l.deputado_id}`} className="border-t border-border align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{l.data ? data(l.data) : l.ano_mes}</td>
                  {mostrarDeputado ? (
                    <td className="py-2 pr-3"><Link href={`/deputado/${l.deputado_id}/`} className="text-destaque hover:underline">{l.deputado}</Link>
                      <span className="block text-xs text-muted">{l.partido}-{l.uf}</span></td>
                  ) : null}
                  <td className="py-2 pr-3">{l.categoria}</td>
                  <td className="py-2 pr-3">
                    {l.cnpj_cpf && l.cnpj_cpf.length === 14
                      ? <Link href={`/fornecedor/?cnpj=${l.cnpj_cpf}`} className="text-destaque hover:underline">{l.fornecedor}</Link>
                      : l.fornecedor}
                  </td>
                  <td className="py-2 pr-3">
                    {l.passageiro ? (
                      <>
                        {l.passageiro}
                        {l.passageiro_e_deputado === false ? (
                          <span className="ml-1 rounded border border-atencao/60 bg-atencao/15 px-1 text-[10px] font-semibold uppercase">terceiro</span>
                        ) : null}
                        <span className="block text-xs text-muted">{l.trecho}</span>
                      </>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{brl(l.valor_liquido)}</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{l.valor_glosa ? brl(l.valor_glosa) : "—"}</td>
                  <td className="py-2">
                    {l.url_documento ? (
                      <a href={l.url_documento} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-destaque"
                        aria-label="Abrir nota fiscal original"><ExternalLink size={14} aria-hidden /> Nota</a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {paginas > 1 ? (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <button type="button" className="rounded-md border border-border px-2 py-1 disabled:opacity-40" disabled={pagina === 0}
            onClick={() => setPagina((p) => p - 1)}>Anterior</button>
          <span className="text-muted">Página {pagina + 1} de {paginas}</span>
          <button type="button" className="rounded-md border border-border px-2 py-1 disabled:opacity-40" disabled={pagina + 1 >= paginas}
            onClick={() => setPagina((p) => p + 1)}>Próxima</button>
        </div>
      ) : null}
    </section>
  );
}
