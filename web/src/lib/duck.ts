"use client";
/**
 * DuckDB-WASM no navegador: consulta os Parquet publicados em /data/parquet.
 *
 * Duas formas de ler cada arquivo, com troca automática por tabela quando uma falha:
 *  - "extensao": extensão Parquet do DuckDB (leitura parcial por HTTP range, sem baixar o arquivo todo);
 *  - "reserva": parquet-wasm decodifica o arquivo e entrega ao DuckDB como Arrow.
 * Se as duas falharem, a consulta devolve o resultado guardado da última vez que deu certo (ver resiliencia.ts).
 */
import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import { useEffect, useState } from "react";
import { avisarDados, buscarBytes, buscarJson, chaveConsulta, esperar, guardarResultado, lerResultado } from "./resiliencia";

export const TABELAS = ["despesas", "fornecedores", "votacoes", "votos", "orientacoes", "sessoes", "presencas",
  "proposicoes", "autorias", "relatorias", "rede_arestas", "deputados", "series", "orientacao_partido"] as const;

type Leitor = "extensao" | "reserva";

interface Motor {
  db: AsyncDuckDB;
  duckdb: typeof import("@duckdb/duckdb-wasm");
  con: AsyncDuckDBConnection;
  local: string;
  base: string;
  /** Há uma extensão Parquet utilizável (hospedada no site ou no repositório oficial). */
  extensao: boolean;
  /** Como cada tabela está sendo lida agora. */
  leitor: Map<string, Leitor>;
  /** Carregamentos pelo leitor de reserva (em andamento ou concluídos). */
  reserva: Map<string, Promise<void>>;
  pq: Promise<typeof import("parquet-wasm")> | null;
}

let motor: Promise<Motor> | null = null;

/** Devolve o motor; se a inicialização falhar, a falha não fica guardada: a próxima consulta tenta de novo. */
function obterMotor(): Promise<Motor> {
  if (motor) return motor;
  const p = iniciar();
  motor = p;
  p.catch(() => {
    if (motor === p) motor = null;
  });
  return p;
}

/** Operações que trocam o leitor de uma tabela rodam uma de cada vez. */
let fila: Promise<unknown> = Promise.resolve();
function serializar<T>(fn: () => Promise<T>): Promise<T> {
  const p = fila.then(fn, fn);
  fila = p.catch(() => {});
  return p;
}

function tabelasDoSql(sql: string): string[] {
  return TABELAS.filter((t) => new RegExp(`\\b${t}\\b`).test(sql));
}

/** Remove a tabela ou a visão com esse nome (o DuckDB recusa o tipo errado, então tenta os dois). */
async function soltar(m: Motor, t: string) {
  for (const cmd of [`DROP VIEW IF EXISTS ${t}`, `DROP TABLE IF EXISTS ${t}`]) {
    try {
      await m.con.query(cmd);
    } catch {
      // o objeto é do outro tipo
    }
  }
}

async function ligarExtensao(m: Motor, t: string): Promise<void> {
  await m.db.registerFileURL(`${t}.parquet`, `${m.base}/${t}.parquet`, m.duckdb.DuckDBDataProtocol.HTTP, false);
  await m.con.query(`CREATE OR REPLACE VIEW ${t} AS SELECT * FROM read_parquet('${t}.parquet')`);
  m.reserva.delete(t);
  m.leitor.set(t, "extensao");
}

function carregarPq(m: Motor): Promise<typeof import("parquet-wasm")> {
  let p = m.pq;
  if (!p) {
    p = (async () => {
      const mod = await import("parquet-wasm");
      await mod.default(`${m.local}/parquet_wasm_bg.wasm`);
      return mod;
    })();
    m.pq = p;
    const q = p;
    q.catch(() => {
      if (m.pq === q) m.pq = null;
    });
  }
  return p;
}

function ligarReserva(m: Motor, t: string): Promise<void> {
  let p = m.reserva.get(t);
  if (!p) {
    p = (async () => {
      const mod = await carregarPq(m);
      const bytes = await buscarBytes(`${m.base}/${t}.parquet`);
      await soltar(m, t);
      await m.con.insertArrowFromIPCStream(mod.readParquet(bytes).intoIPCStream(), { name: t, create: true });
      m.leitor.set(t, "reserva");
    })();
    m.reserva.set(t, p);
    const q = p;
    q.catch(() => {
      if (m.reserva.get(t) === q) m.reserva.delete(t);
    });
  }
  return p;
}

async function iniciar(): Promise<Motor> {
  const duckdb = await import("@duckdb/duckdb-wasm");
  const origem = window.location.origin;
  // Bundle "eh" hospedado junto com o site (public/duckdb); navegadores sem suporte caem no "mvp" do jsDelivr.
  const local = `${origem}/duckdb`;
  const cdn = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle({
    mvp: cdn.mvp,
    eh: { mainModule: `${local}/duckdb-eh.wasm`, mainWorker: `${local}/duckdb-browser-eh.worker.js` },
  });
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" }),
  );
  const db: AsyncDuckDB = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING), new Worker(workerUrl));
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);
  const con = await db.connect();
  const info = await buscarJson<{ extensao?: boolean }>(`${local}/info.json`, []).catch(() => ({ extensao: false }));

  const m: Motor = { db, duckdb, con, local, base: `${origem}/data/parquet`, extensao: Boolean(info.extensao),
    leitor: new Map(), reserva: new Map(), pq: null };

  if (m.extensao) {
    try {
      await con.query(`SET custom_extension_repository = '${local}/extensions'`);
    } catch {
      m.extensao = false;
    }
  }
  if (m.extensao) {
    for (const t of TABELAS) {
      try {
        await ligarExtensao(m, t);
      } catch (e) {
        console.warn(`Leitor Parquet nativo falhou em ${t}; usando o leitor de reserva.`, e);
      }
    }
  }
  // O que não ficou com a extensão será carregado pelo leitor de reserva, sob demanda.
  for (const t of TABELAS) if (!m.leitor.has(t)) m.leitor.set(t, "reserva");
  return m;
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

async function executar<T>(sql: string, params: unknown[]): Promise<T[]> {
  const m = await obterMotor();
  for (const t of tabelasDoSql(sql)) if (m.leitor.get(t) === "reserva") await ligarReserva(m, t);
  const stmt = await m.con.prepare(sql);
  try {
    const tabela = await stmt.query(...params);
    return tabela.toArray().map((r) => paraJs(r.toJSON()) as T);
  } finally {
    await stmt.close();
  }
}

/**
 * Troca o leitor das tabelas da consulta e executa de novo. `antes` é como cada tabela estava sendo lida quando a
 * consulta falhou: se outra consulta já trocou o leitor nesse intervalo, não troca de novo (evita ficar alternando).
 */
async function executarComOutroLeitor<T>(sql: string, params: unknown[], antes: Map<string, Leitor | undefined>): Promise<T[]> {
  const m = await obterMotor();
  await serializar(async () => {
    for (const t of tabelasDoSql(sql)) {
      const atual = m.leitor.get(t);
      if (atual !== antes.get(t)) continue;
      if (atual === "reserva") {
        if (!m.extensao) {
          // Último recurso: o repositório oficial de extensões do DuckDB.
          try {
            await m.con.query(`SET custom_extension_repository = 'https://extensions.duckdb.org'`);
            m.extensao = true;
          } catch {
            continue;
          }
        }
        await soltar(m, t);
        await ligarExtensao(m, t);
      } else {
        m.leitor.set(t, "reserva");
        await ligarReserva(m, t);
      }
    }
  });
  return executar<T>(sql, params);
}

export interface Resultado<T> {
  dados: T[];
  /** true quando veio da cópia guardada na última vez que a consulta deu certo. */
  desatualizado: boolean;
}

/** Executa a consulta; se falhar, tenta o outro leitor e, por fim, devolve o resultado guardado da última vez. */
export async function consultarComStatus<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<Resultado<T>> {
  const chave = chaveConsulta(sql, params);
  const antes = new Map<string, Leitor | undefined>();
  try {
    const m = await obterMotor();
    for (const t of tabelasDoSql(sql)) antes.set(t, m.leitor.get(t));
  } catch {
    // sem motor: a tentativa abaixo inicia de novo
  }
  let primeiroErro: unknown;
  try {
    const dados = await executar<T>(sql, params);
    guardarResultado(chave, dados);
    return { dados, desatualizado: false };
  } catch (e) {
    primeiroErro = e;
    console.warn("A consulta falhou; tentando outro leitor de dados.", e);
  }
  try {
    const dados = await executarComOutroLeitor<T>(sql, params, antes);
    guardarResultado(chave, dados);
    return { dados, desatualizado: false };
  } catch (e) {
    console.warn("O outro leitor de dados também falhou.", e);
  }
  const guardado = lerResultado<T>(chave);
  if (guardado) return { dados: guardado, desatualizado: true };
  throw primeiroErro;
}

export async function consultar<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await consultarComStatus<T>(sql, params)).dados;
}

export interface Consulta {
  sql: string;
  params: unknown[];
}

const ESPERAS_NOVA_TENTATIVA = [2000, 6000];

/**
 * Executa uma consulta e reexecuta quando o SQL ou os parâmetros mudam.
 * Se falhar, tenta de novo sozinha duas vezes antes de mostrar erro; enquanto isso continua "carregando".
 */
export function useConsulta<T = Record<string, unknown>>(q: Consulta | null) {
  const [estado, setEstado] = useState<{ dados: T[] | null; carregando: boolean; erro: string | null; desatualizado: boolean }>({
    dados: null, carregando: !!q, erro: null, desatualizado: false,
  });
  const [rodada, setRodada] = useState(0);
  const chave = q ? JSON.stringify(q) : "";
  useEffect(() => {
    if (!q) return;
    let cancelado = false;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    (async () => {
      for (let i = 0; ; i++) {
        try {
          const r = await consultarComStatus<T>(q.sql, q.params);
          if (cancelado) return;
          setEstado({ dados: r.dados, carregando: false, erro: null, desatualizado: r.desatualizado });
          avisarDados(r.desatualizado ? "desatualizado" : "atualizado");
          return;
        } catch (e) {
          if (cancelado) return;
          if (i >= ESPERAS_NOVA_TENTATIVA.length) {
            console.error("Não foi possível ler os dados.", e);
            setEstado({ dados: null, carregando: false, erro: e instanceof Error ? e.message : String(e), desatualizado: false });
            return;
          }
          await esperar(ESPERAS_NOVA_TENTATIVA[i]);
          if (cancelado) return;
        }
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, rodada]);
  return { ...estado, tentarDeNovo: () => setRodada((n) => n + 1) };
}
