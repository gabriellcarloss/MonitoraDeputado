/** Endereço público do site (variável SITE_URL do GitHub Actions; padrão: o domínio da Vercel). */
export const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://monitoradeputado.vercel.app").replace(/\/+$/, "");

/** Contato e projetos do autor (botões do menu e do rodapé). */
export const AUTOR = {
  nome: "Gabriel Carlos",
  whatsapp: `https://wa.me/5511918737727?text=${encodeURIComponent("Olá, Gabriel! Vi o MonitoraDeputado e queria conversar.")}`,
  linkedin: "https://www.linkedin.com/in/gabriel-carlos-moreira/",
  apuracao: "https://apuracao-2026-five.vercel.app/#v=geral&cargo=pres&uf=BR",
};
