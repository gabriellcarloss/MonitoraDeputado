/**
 * Coleta de cadastros, contatos e acessos: o site é estático, então os dados vão direto para uma planilha do Google
 * por um Apps Script publicado como "App da Web" (veja docs/coleta-planilha.md).
 * Sem a variável NEXT_PUBLIC_COLETA_URL na hora do build, a coleta fica desligada e os formulários não aparecem.
 */

export const COLETA_URL = (process.env.NEXT_PUBLIC_COLETA_URL ?? "").trim();
export const coletaAtiva = COLETA_URL.startsWith("https://");

export type TipoColeta = "cadastro" | "contato" | "acesso";

export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailValido(v: string): boolean {
  return v.length <= 254 && REGEX_EMAIL.test(v.trim());
}

/**
 * Envia um registro. O navegador não deixa ler a resposta do Google (modo "no-cors"), então "true" significa
 * apenas que o envio saiu sem erro de rede; a validação de verdade também é refeita no script.
 */
export async function enviar(tipo: TipoColeta, dados: Record<string, string | boolean>): Promise<boolean> {
  if (!coletaAtiva) return false;
  try {
    await fetch(COLETA_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ tipo, ...dados }),
      keepalive: true,
    });
    return true;
  } catch {
    return false;
  }
}
