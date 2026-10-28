/**
 * Resiliência da leitura de dados: uma falha de rede ou de leitura não pode virar tela de erro
 * quando existe algo guardado da última vez que carregou.
 *
 *  - novas tentativas com espera crescente;
 *  - cópia dos arquivos (JSON e Parquet) no Cache Storage do navegador;
 *  - cópia do resultado das consultas no localStorage;
 *  - um evento global avisa quando o que aparece na tela veio da cópia guardada.
 */

export const esperar = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Executa `fn` e, se falhar, tenta de novo após cada espera da lista. Lança o último erro se todas falharem. */
export async function comTentativas<T>(fn: () => Promise<T>, esperas: number[] = [800, 2500]): Promise<T> {
  let ultimo: unknown;
  for (let i = 0; i <= esperas.length; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      if (i < esperas.length) await esperar(esperas[i]);
    }
  }
  throw ultimo;
}

/* ---------- aviso de dados guardados ---------- */

export const EVENTO_DADOS = "md:dados";
export type EstadoDados = "atualizado" | "desatualizado";

export function avisarDados(estado: EstadoDados) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent<EstadoDados>(EVENTO_DADOS, { detail: estado }));
  } catch {
    // ambiente sem CustomEvent: o aviso é só um complemento
  }
}

/* ---------- arquivos (JSON e Parquet) ---------- */

const CACHE_ARQUIVOS = "md-arquivos-v1";

async function abrirCache(): Promise<Cache | null> {
  try {
    return typeof caches === "undefined" ? null : await caches.open(CACHE_ARQUIVOS);
  } catch {
    return null;
  }
}

export interface Arquivo {
  resposta: Response;
  /** true quando a rede falhou e a resposta veio da cópia guardada na última visita. */
  desatualizado: boolean;
}

/** Busca um arquivo na rede (com novas tentativas); se não der, usa a cópia guardada da última vez que carregou. */
export async function buscarArquivo(url: string, esperas?: number[]): Promise<Arquivo> {
  try {
    const resposta = await comTentativas(async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status} ao carregar ${url}`);
      return r;
    }, esperas);
    const cache = await abrirCache();
    if (cache) {
      try {
        // não espera terminar: a cópia é gravada enquanto o arquivo já está sendo usado
        void cache.put(url, resposta.clone()).catch(() => {});
      } catch {
        // cópia é um extra
      }
    }
    return { resposta, desatualizado: false };
  } catch (erro) {
    const cache = await abrirCache();
    let guardada: Response | undefined;
    try {
      guardada = cache ? await cache.match(url) : undefined;
    } catch {
      guardada = undefined;
    }
    if (guardada) {
      avisarDados("desatualizado");
      return { resposta: guardada, desatualizado: true };
    }
    throw erro;
  }
}

export async function buscarJson<T>(url: string, esperas?: number[]): Promise<T> {
  const { resposta } = await buscarArquivo(url, esperas);
  return (await resposta.json()) as T;
}

export async function buscarBytes(url: string, esperas?: number[]): Promise<Uint8Array> {
  const { resposta } = await buscarArquivo(url, esperas);
  return new Uint8Array(await resposta.arrayBuffer());
}

/* ---------- resultado das consultas ---------- */

const PREFIXO = "md:q:";
const INDICE = "md:q:indice";
export const MAX_ENTRADAS = 60;
export const MAX_CARACTERES = 300_000;

function djb2(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
function sdbm(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (s.charCodeAt(i) + (h << 6) + (h << 16) - h) | 0;
  return (h >>> 0).toString(36);
}

/** Identificador estável de uma consulta (SQL + parâmetros). */
export function chaveConsulta(sql: string, params: unknown[] = []): string {
  const base = `${sql}\u0000${JSON.stringify(params, (_k, v) => (typeof v === "bigint" ? Number(v) : v))}`;
  return `${djb2(base)}${sdbm(base)}`;
}

function lerIndice(): string[] {
  try {
    const bruto = JSON.parse(localStorage.getItem(INDICE) ?? "[]");
    return Array.isArray(bruto) ? bruto.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Guarda o resultado da última consulta bem-sucedida. Resultados muito grandes não são guardados; os mais antigos saem primeiro. */
export function guardarResultado(chave: string, dados: unknown): void {
  try {
    const texto = JSON.stringify(dados);
    if (texto.length > MAX_CARACTERES) return;
    localStorage.setItem(PREFIXO + chave, texto);
    const indice = lerIndice().filter((k) => k !== chave);
    indice.push(chave);
    while (indice.length > MAX_ENTRADAS) {
      const antiga = indice.shift();
      if (antiga) localStorage.removeItem(PREFIXO + antiga);
    }
    localStorage.setItem(INDICE, JSON.stringify(indice));
  } catch {
    // armazenamento cheio ou bloqueado (navegação privada): segue sem cópia
  }
}

export function lerResultado<T>(chave: string): T[] | null {
  try {
    const texto = localStorage.getItem(PREFIXO + chave);
    if (!texto) return null;
    const dados = JSON.parse(texto);
    return Array.isArray(dados) ? (dados as T[]) : null;
  } catch {
    return null;
  }
}
