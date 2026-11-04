"use client";

import { Braces, Database, FileSpreadsheet, FileText, Loader2, PackageOpen } from "lucide-react";
import { useState } from "react";
import { registrarEvento } from "@/components/coleta/Acessos";
import { consultar } from "@/lib/duck";
import { baixarTabela, type Tabela } from "@/lib/exportar";
import { num } from "@/lib/format";

export interface Conjunto {
  tabela: string;
  titulo: string;
  descricao: string;
  /** Filtro SQL por ano quando a tabela é grande; "{ano}" é trocado pelo ano escolhido. */
  ano?: string;
}

const LIMITE_SEM_ANO = 150_000;

async function lerTabela(t: string, onde = ""): Promise<Tabela> {
  const desc = await consultar<{ column_name: string; column_type: string }>(`DESCRIBE SELECT * FROM ${t}`);
  const sel = desc.map(({ column_name: c, column_type: tipo }) => {
    const q = `"${c.replace(/"/g, '""')}"`;
    if (/^(DATE|TIMESTAMP)/.test(tipo)) return `strftime(${q}, '%Y-%m-%d') AS ${q}`;
    if (/STRUCT|\[\]|MAP|LIST/.test(tipo)) return `CAST(${q} AS VARCHAR) AS ${q}`;
    return q;
  });
  const linhas = await consultar<Record<string, string | number | boolean | null>>(`SELECT ${sel.join(", ")} FROM ${t} ${onde}`);
  const colunas = desc.map((d) => d.column_name);
  return { colunas, linhas: linhas.map((l) => colunas.map((c) => l[c] ?? null)) };
}

/** Um cartão por base: Excel/CSV/JSON gerados no navegador (DuckDB) e o arquivo Parquet original. */
export function BaixarDados({ conjuntos, contagens, anos }: { conjuntos: Conjunto[]; contagens: Record<string, number>; anos: number[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {conjuntos.map((c, i) => <CartaoConjunto key={c.tabela} c={c} n={contagens[c.tabela] ?? 0} anos={anos} i={i} />)}
    </div>
  );
}

function CartaoConjunto({ c, n, anos, i }: { c: Conjunto; n: number; anos: number[]; i: number }) {
  const grande = n > LIMITE_SEM_ANO;
  const [ano, setAno] = useState<number | "">(grande && c.ano ? anos[anos.length - 1] ?? "" : "");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const podeGerar = !grande || (c.ano && ano !== "");

  async function gerar(formato: "excel" | "csv" | "json") {
    setOcupado(formato);
    setErro(false);
    try {
      const onde = c.ano && ano !== "" ? `WHERE ${c.ano.replace("{ano}", String(Math.trunc(Number(ano))))}` : "";
      const t = await lerTabela(c.tabela, onde);
      baixarTabela(t, formato, `${c.titulo}${ano !== "" ? ` ${ano}` : ""}`);
      registrarEvento("exportar", `base ${c.tabela}${ano !== "" ? ` ${ano}` : ""} · ${formato}`);
    } catch (e) {
      console.warn(e);
      setErro(true);
    } finally {
      setOcupado(null);
    }
  }

  const botao = (f: "excel" | "csv" | "json", Icone: typeof FileText, rotulo: string) => (
    <button type="button" disabled={!podeGerar || !!ocupado} onClick={() => void gerar(f)}
      className="pilula h-8 px-3 text-xs disabled:opacity-50">
      {ocupado === f ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Icone size={14} aria-hidden />} {rotulo}
    </button>
  );

  return (
    <section className="cartao brilho-varre flex flex-col p-4" data-revelar data-tilt="4" style={{ ["--atraso" as string]: `${i * 40}ms` }}>
      <div className="flex items-start gap-3">
        <span className="profundo grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#1f4fa3] to-[#002776] text-white shadow-[0_8px_18px_-8px_rgb(0_39_118/0.8)]">
          <Database size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl leading-tight">{c.titulo}</h2>
          <p className="num text-xs font-semibold text-destaque">{n ? `${num(n)} registros` : "—"}</p>
        </div>
      </div>
      <p className="mt-2 flex-1 text-sm text-muted">{c.descricao}</p>
      {grande && c.ano ? (
        <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted">
          Ano
          <select className="campo-filtro h-8 py-0 text-xs" value={ano} onChange={(e) => setAno(e.target.value ? Number(e.target.value) : "")}>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="font-normal">base grande: baixe por ano, ou o Parquet completo</span>
        </label>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {grande && !c.ano ? null : (
          <>
            {botao("excel", FileSpreadsheet, "Excel")}
            {botao("csv", FileText, "CSV")}
            {botao("json", Braces, "JSON")}
          </>
        )}
        <a href={`/data/parquet/${c.tabela}.parquet`} download onClick={() => registrarEvento("exportar", `base ${c.tabela} · parquet`)}
          className="pilula h-8 px-3 text-xs"><PackageOpen size={14} aria-hidden /> Parquet completo</a>
      </div>
      {erro ? <p className="mt-2 text-xs text-alta" role="status">Não foi possível gerar agora. Tente de novo ou baixe o Parquet.</p> : null}
    </section>
  );
}
