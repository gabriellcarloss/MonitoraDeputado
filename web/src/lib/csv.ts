import { iso } from "./format";

/** CSV com ';' (padrão do Excel em pt-BR); colunas de data saem como AAAA-MM-DD. */
export function paraCsv<T extends Record<string, unknown>>(linhas: T[], colunas: (keyof T & string)[], datas: string[] = ["data"]): string {
  const esc = (v: unknown) => (v === null || v === undefined ? "" : `"${String(v).replace(/"/g, '""')}"`);
  return [colunas.join(";"), ...linhas.map((l) => colunas.map((c) => esc(datas.includes(c) ? iso(l[c]) : l[c])).join(";"))].join("\n");
}
