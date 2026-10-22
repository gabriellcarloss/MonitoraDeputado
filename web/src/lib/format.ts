const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const fmtBrl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export const TRACO = "—";

export function brl(v: number): string {
  return fmtBrl.format(v).replace(/ /g, " ");
}

export function brlCurto(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `R$ ${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
  if (a >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (a >= 1e3) return `R$ ${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return brl(v);
}

export function pct(v: number, casas = 1): string {
  return `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

export function num(v: number): string {
  return fmtNum.format(v);
}

export function mes(periodo: string): string {
  const [a, m] = periodo.split("-");
  return `${MESES[Number(m) - 1]}/${a}`;
}

/** Normaliza datas (texto ISO, Date ou epoch em ms vindo do Arrow) para AAAA-MM-DD. */
export function iso(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" || v instanceof Date) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return String(v).slice(0, 10);
}

export function data(v: string | number | Date | null | undefined): string {
  const s = iso(v);
  if (!s) return TRACO;
  const [a, m, d] = s.split("-");
  return `${d}/${m}/${a}`;
}

export function ouTraco(v: number | null | undefined, f: (n: number) => string): string {
  return v === null || v === undefined || !Number.isFinite(v) ? TRACO : f(v);
}
