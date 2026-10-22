import { UFS } from "./indicadores";

export interface Resultado {
  tipo: "deputado" | "uf" | "partido" | "fornecedor" | "fornecedor-nome" | "passageiro";
  rotulo: string;
  detalhe?: string;
  href: string;
}

interface DepBusca { id: number; nome: string; uf: string; partido_atual: string }

const sem = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/** Busca global: deputados, UF e partido (locais) + atalhos para fornecedor (CNPJ/nome) e passageiro. */
export function buscar(termo: string, deputados: DepBusca[]): Resultado[] {
  const t = termo.trim();
  if (t.length < 2) return [];
  const digitos = t.replace(/\D/g, "");
  if (digitos.length === 14 && /^[\d./\-\s]+$/.test(t)) {
    return [{ tipo: "fornecedor", rotulo: `Fornecedor CNPJ ${t}`, href: `/fornecedor/?cnpj=${digitos}` }];
  }
  const q = sem(t);
  const out: Resultado[] = [];
  const up = t.toUpperCase();
  if (UFS.includes(up)) out.push({ tipo: "uf", rotulo: `Deputados de ${up}`, href: `/deputados/?uf=${up}` });
  for (const p of Array.from(new Set(deputados.map((d) => d.partido_atual)))) {
    if (sem(p) === q) out.push({ tipo: "partido", rotulo: `Deputados do ${p}`, href: `/deputados/?partido=${encodeURIComponent(p)}` });
  }
  const palavras = q.split(/\s+/);
  for (const d of deputados.filter((d) => palavras.every((w) => sem(d.nome).includes(w))).slice(0, 6)) {
    out.push({ tipo: "deputado", rotulo: d.nome, detalhe: `${d.partido_atual}-${d.uf}`, href: `/deputado/${d.id}/` });
  }
  out.push({ tipo: "fornecedor-nome", rotulo: `Fornecedores com “${t}”`, href: `/gastos/?fornecedor=${encodeURIComponent(t)}` });
  out.push({ tipo: "passageiro", rotulo: `Passageiro “${t}”`, detalhe: "passagens pagas pela cota", href: `/gastos/passagens/?passageiro=${encodeURIComponent(t)}` });
  return out;
}
