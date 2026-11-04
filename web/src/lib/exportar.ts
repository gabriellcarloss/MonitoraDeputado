/**
 * Exportação de tabelas e gráficos: CSV para Excel em português (ponto e vírgula, vírgula decimal, acentos certos),
 * CSV internacional (vírgula, ponto decimal), JSON e imagem PNG do gráfico. Tudo gerado no navegador.
 */
import { iso } from "./format";

export type FormatoExportacao = "excel" | "csv" | "json" | "png";
export type Valor = string | number | boolean | null | undefined | Date;
export interface Tabela { colunas: string[]; linhas: Valor[][] }

const ROTULOS: Record<FormatoExportacao, string> = {
  excel: "Excel (CSV em português)", csv: "CSV (padrão internacional)", json: "JSON", png: "Imagem PNG",
};
export const rotuloFormato = (f: FormatoExportacao) => ROTULOS[f];

function textoCelula(v: Valor, ptBR: boolean): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return iso(v) ?? "";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    const s = Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
    return ptBR ? s.replace(".", ",") : s;
  }
  if (typeof v === "boolean") return v ? (ptBR ? "sim" : "true") : (ptBR ? "não" : "false");
  return String(v);
}

/** CSV com aspas em todas as células de texto; evita que o Excel interprete "=..." como fórmula. */
export function gerarCsv(t: Tabela, ptBR: boolean): string {
  const sep = ptBR ? ";" : ",";
  const esc = (v: Valor) => {
    let s = textoCelula(v, ptBR);
    if (typeof v === "number") return s;
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [t.colunas.map((c) => esc(c)).join(sep), ...t.linhas.map((l) => l.map(esc).join(sep))].join("\r\n");
}

export function gerarJson(t: Tabela): string {
  return JSON.stringify(t.linhas.map((l) => Object.fromEntries(t.colunas.map((c, i) => [c, l[i] instanceof Date ? iso(l[i]) : l[i] ?? null]))), null, 2);
}

/** Nome de arquivo seguro: "Gasto por categoria" → monitoradeputado-gasto-por-categoria-2026-11-04 */
export function nomeArquivo(base: string): string {
  const limpo = base.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `monitoradeputado-${limpo || "dados"}-${new Date().toISOString().slice(0, 10)}`;
}

export function baixar(conteudo: BlobPart, nome: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function baixarTabela(t: Tabela, formato: Exclude<FormatoExportacao, "png">, base: string) {
  const nome = nomeArquivo(base);
  if (formato === "json") baixar(gerarJson(t), `${nome}.json`, "application/json;charset=utf-8");
  else baixar(`﻿${gerarCsv(t, formato === "excel")}`, `${nome}.csv`, "text/csv;charset=utf-8");
}

/** Imagem do gráfico ECharts que estiver dentro de `raiz` (com fundo do tema e em alta resolução). */
export async function baixarGrafico(raiz: HTMLElement, base: string): Promise<boolean> {
  const el = raiz.querySelector<HTMLElement>("[_echarts_instance_]");
  if (!el) return false;
  const { echarts } = await import("@/components/charts/echarts-core");
  const inst = echarts.getInstanceByDom(el);
  if (!inst) return false;
  const fundo = getComputedStyle(document.documentElement).getPropertyValue("--card").trim().split(/\s+/).join(",");
  const url = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: fundo ? `rgb(${fundo})` : "#ffffff" });
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomeArquivo(base)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}
