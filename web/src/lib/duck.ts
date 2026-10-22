"use client";
/** DuckDB-WASM no navegador: consulta os Parquet publicados em /data/parquet. */
import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import { useEffect, useRef, useState } from "react";

export const TABELAS = ["despesas", "fornecedores", "votacoes", "votos", "orientacoes", "sessoes", "presencas",
  "proposicoes", "autorias", "relatorias", "rede_arestas", "deputados", "series"] as const;

let conexao: Promise<AsyncDuckDBConnection> | null = null;

async function iniciar(): Promise<AsyncDuckDBConnection> {
  const duckdb = await import("@duckdb/duckdb-wasm");
  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" }),
  );
  const db: AsyncDuckDB = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING), new Worker(workerUrl));
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);
  const con = await db.connect();
  const base = `${window.location.origin}/data/parquet`;
  for (const t of TABELAS) {
    await db.registerFileURL(`${t}.parquet`, `${base}/${t}.parquet`, duckdb.DuckDBDataProtocol.HTTP, false);
    await con.query(`CREATE OR REPLACE VIEW ${t} AS SELECT * FROM read_parquet('${t}.parquet')`);
  }
  return con;
}

function paraJs(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v && typeof v === "object" && "toJSON" in v && typeof (v as { toJSON: unknown }).toJSON === "function") {
    return paraJs((v as { toJSON(): unknown }).toJSON());
  }
  if (Array.isArray(v)) return v.map(paraJs);
  if (v && typeof v === "object" && !(v instanceof Date)) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, paraJs(x)]));
  }
  return v;
}

export async function consultar<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  conexao ??= iniciar();
  const con = await conexao;
  const stmt = await con.prepare(sql);
  try {
    const tabela = await stmt.query(...params);
    return tabela.toArray().map((r) => paraJs(r.toJSON()) as T);
  } finally {
    await stmt.close();
  }
}

export interface Consulta {
  sql: string;
  params: unknown[];
}

/** Executa uma consulta e reexecuta quando o SQL ou os parâmetros mudam. */
export function useConsulta<T = Record<string, unknown>>(q: Consulta | null) {
  const [estado, setEstado] = useState<{ dados: T[] | null; carregando: boolean; erro: string | null }>({
    dados: null, carregando: !!q, erro: null,
  });
  const chave = q ? JSON.stringify(q) : "";
  const atual = useRef(chave);
  useEffect(() => {
    atual.current = chave;
    if (!q) return;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    consultar<T>(q.sql, q.params)
      .then((dados) => atual.current === chave && setEstado({ dados, carregando: false, erro: null }))
      .catch((e: Error) => atual.current === chave && setEstado({ dados: null, carregando: false, erro: e.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  return estado;
}
