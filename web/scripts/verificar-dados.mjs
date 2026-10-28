// Trava de publicação: abre o site gerado (pasta out/) num navegador limpo, sem nenhuma cópia guardada,
// e confere que as páginas que leem Parquet no navegador mostram dados de verdade.
// Se algo falhar, o fluxo para ANTES de publicar e a versão que já está no ar continua valendo.
// Uso: node scripts/verificar-dados.mjs
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const porta = 4398;
const servidor = spawn("pnpm", ["exec", "serve", "out", "-l", String(porta), "--no-clipboard"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 3000));

const deps = JSON.parse(readFileSync("public/data/deputados.json", "utf8"));
const ativo = deps.find((d) => d.indicadores && d.indicadores.meses_exercicio >= 1) ?? deps[0];

const paginas = [
  { rota: "/gastos/", nome: "Gastos" },
  { rota: "/deputados/", nome: "Lista de deputados" },
  { rota: "/presenca/", nome: "Presença" },
  { rota: "/votacoes/", nome: "Votações" },
  { rota: `/deputado/${ativo.id}/?aba=gastos`, nome: "Perfil: gastos" },
  { rota: `/deputado/${ativo.id}/?aba=votacoes`, nome: "Perfil: votações" },
];

const b = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const falhas = [];
for (const { rota, nome } of paginas) {
  const ctx = await b.newContext(); // limpo: sem Cache Storage nem localStorage de visitas anteriores
  const p = await ctx.newPage();
  const logs = [];
  p.on("pageerror", (e) => logs.push(String(e)));
  try {
    await p.goto(`http://localhost:${porta}${rota}`, { waitUntil: "networkidle", timeout: 90000 });
    // espera as consultas terminarem (ou falharem de vez, depois das novas tentativas automáticas)
    await p.waitForFunction(() => !document.body.innerText.includes("Carregando dados"), null, { timeout: 90000 });
    const texto = await p.evaluate(() => document.body.innerText);
    if (/não carregaram agora|Não foi possível carregar/i.test(texto)) falhas.push(`${nome} (${rota}): mostrou mensagem de erro`);
    else if (/dados salvos da sua última visita/i.test(texto)) falhas.push(`${nome} (${rota}): caiu em dados guardados num navegador limpo`);
    else if (await p.locator("main [role=alert]").count()) falhas.push(`${nome} (${rota}): alerta de erro na tela`);
  } catch (e) {
    falhas.push(`${nome} (${rota}): ${String(e).split("\n")[0]} ${logs.slice(0, 2).join(" | ")}`);
  }
  await ctx.close();
}
await b.close();
servidor.kill();

if (falhas.length) {
  console.error("Verificação dos dados FALHOU:\n- " + falhas.join("\n- "));
  process.exit(1);
}
console.log(`Verificação dos dados OK em ${paginas.length} páginas.`);
