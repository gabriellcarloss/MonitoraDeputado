/** Filtros refletidos na URL: interpretação tolerante (valores inválidos são ignorados). */

export interface Filtros {
  uf?: string;
  partido?: string;
  inicio?: string; // AAAA-MM
  fim?: string; // AAAA-MM
  categoria?: string;
  cnpj?: string;
  deputado?: number;
  passageiro?: string;
  busca?: string;
  situacao?: "exercicio" | "fora";
  sexo?: "M" | "F";
  alertas?: "com" | "sem";
  trocou?: "sim";
  gasto_min?: number;
  gasto_max?: number;
  ordem?: string;
  /** Uso interno (não vem da URL): só categorias de passagem. */
  so_passagens?: boolean;
}

interface Opcoes {
  ufs: string[];
  partidos: string[];
}

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

function numero(v: string | null): number | undefined {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function texto(v: string | null, max = 120): string | undefined {
  const t = v?.trim();
  return t ? t.slice(0, max) : undefined;
}

export function parseFiltros(sp: URLSearchParams, opcoes: Opcoes): Filtros {
  const g = (k: string) => sp.get(k);
  const f: Filtros = {};
  const uf = g("uf")?.toUpperCase();
  if (uf && opcoes.ufs.includes(uf)) f.uf = uf;
  const partido = g("partido");
  if (partido && opcoes.partidos.includes(partido)) f.partido = partido;
  let ini = g("inicio") ?? undefined;
  let fim = g("fim") ?? undefined;
  if (ini && !MES.test(ini)) ini = undefined;
  if (fim && !MES.test(fim)) fim = undefined;
  if (ini && fim && ini > fim) [ini, fim] = [fim, ini];
  f.inicio = ini;
  f.fim = fim;
  f.categoria = texto(g("categoria"), 200);
  const cnpj = g("cnpj")?.replace(/\D/g, "");
  if (cnpj && (cnpj.length === 14 || cnpj.length === 11)) f.cnpj = cnpj;
  const dep = numero(g("deputado"));
  if (dep && Number.isInteger(dep)) f.deputado = dep;
  f.passageiro = texto(g("passageiro"));
  f.busca = texto(g("busca"));
  const sit = g("situacao");
  if (sit === "exercicio" || sit === "fora") f.situacao = sit;
  const sexo = g("sexo");
  if (sexo === "M" || sexo === "F") f.sexo = sexo;
  const al = g("alertas");
  if (al === "com" || al === "sem") f.alertas = al;
  if (g("trocou") === "sim") f.trocou = "sim";
  f.gasto_min = numero(g("gasto_min"));
  f.gasto_max = numero(g("gasto_max"));
  f.ordem = texto(g("ordem"), 60);
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as Filtros;
}

export function paraQuery(f: Partial<Record<keyof Filtros, unknown>>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
