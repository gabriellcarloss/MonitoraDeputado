// Fotografa as páginas principais do site gerado (pasta out/) e resume os dados, para conferência remota.
// Uso: node scripts/inspecao.mjs <pasta-de-saida>
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const destino = path.resolve(process.argv[2] ?? "../inspecao");
mkdirSync(destino, { recursive: true });
const porta = 4399;
const servidor = spawn("pnpm", ["exec", "serve", "out", "-l", String(porta), "--no-clipboard"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 3000));

const ler = (f) => JSON.parse(readFileSync(path.join("public/data", f), "utf8"));
const meta = ler("meta.json");
const deps = ler("deputados.json");
const brasil = ler("brasil.json");
const alertas = ler("alertas.json");
const ativos = deps.filter((d) => d.indicadores && d.indicadores.meses_exercicio >= 1);
const top = (k, asc = false) => [...ativos].filter((d) => d.indicadores[k] !== null)
  .sort((a, b) => (a.indicadores[k] - b.indicadores[k]) * (asc ? 1 : -1)).slice(0, 5)
  .map((d) => `${d.nome} (${d.partido_atual}-${d.uf}): ${d.indicadores[k]}`);
const top2 = (k) => [...deps].filter((d) => d[k]).sort((a, b) => b[k] - a[k]).slice(0, 5).map((d) => `${d.nome} (${d.partido_atual}-${d.uf}): ${d[k]}`);
const contarRegras = alertas.reduce((m, a) => ({ ...m, [a.regra]: (m[a.regra] ?? 0) + 1 }), {});
writeFileSync(path.join(destino, "resumo.json"), JSON.stringify({
  gerado_em: meta.gerado_em, ficticio: meta.ficticio, fontes: meta.fontes, contagens: meta.contagens,
  deputados: deps.length, em_exercicio: deps.filter((d) => d.em_exercicio).length, totais: brasil.totais,
  alertas_por_regra: contarRegras,
  uf: Object.fromEntries(Object.entries(brasil.agregados.uf).map(([uf, g]) => [uf, {
    n: g.n, gasto_mensal_mediana: g.gasto_medio_mensal?.mediana, projetos_mediana: g.n_proposicoes_relevantes?.mediana,
    projetos_media: g.n_proposicoes_relevantes?.media, presenca_mediana: g.pct_presenca_sessoes?.mediana }])),
  maiores_gastos: top("gasto_total"), mais_projetos: top("n_proposicoes_relevantes"),
  menor_presenca: top("pct_presenca_sessoes", true), sem_alinhamento: ativos.filter((d) => d.indicadores.pct_alinhamento_partido === null).length,
  exemplo_deputado: ativos[0]?.id,
  emendas: { deputados_com: deps.filter((d) => d.emendas_empenhado).length, maiores: top2("emendas_empenhado") },
  gabinete: { deputados_com: deps.filter((d) => d.n_secretarios).length, maiores: top2("n_secretarios") },
  faltas: { justificadas_total: ativos.reduce((s, d) => s + (d.indicadores.n_faltas_justificadas ?? 0), 0),
    sem_justificativa_top: top("n_faltas_sem_justificativa") },
}, null, 2));

const b = await chromium.launch({ ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const erros = {};
async function foto(nome, rota, { tema = "light", largura = 1440, rolar = true, favoritos = [] } = {}) {
  const p = await b.newPage({ viewport: { width: largura, height: 1000 } });
  await p.addInitScript(([t, f]) => { try { localStorage.setItem("tema", t); localStorage.setItem("md:favoritos", JSON.stringify(f)); } catch {} },
    [tema === "dark" ? "escuro" : "claro", favoritos]);
  const lista = [];
  p.on("pageerror", (e) => lista.push(String(e)));
  p.on("console", (m) => m.type() === "error" && lista.push(m.text()));
  await p.goto(`http://localhost:${porta}${rota}`, { waitUntil: "networkidle", timeout: 90000 });
  if (rolar) for (let y = 0; y < 20000; y += 700) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(100); }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(5000);
  await p.screenshot({ path: path.join(destino, `${nome}.png`), fullPage: true });
  erros[nome] = lista.slice(0, 10);
  await p.close();
}
const id = [...ativos].sort((a, b) => (b.emendas_empenhado ?? 0) - (a.emendas_empenhado ?? 0))[0]?.id ?? ativos[0]?.id;
const favoritos = ativos.slice(0, 3).map((d) => d.id);
await foto("inicio-claro", "/", { favoritos });
await foto("inicio-escuro", "/", { tema: "dark" });
await foto("inicio-celular", "/", { largura: 390 });
await foto("deputados", "/deputados/");
await foto("perfil-resumo", `/deputado/${id}/`);
await foto("perfil-gastos", `/deputado/${id}/?aba=gastos`);
await foto("perfil-votacoes", `/deputado/${id}/?aba=votacoes`);
await foto("perfil-emendas", `/deputado/${id}/?aba=emendas`);
await foto("perfil-equipe", `/deputado/${id}/?aba=equipe`);
await foto("perfil-presenca", `/deputado/${id}/?aba=presenca`);
await foto("perfil-celular", `/deputado/${id}/`, { largura: 390 });
await foto("deputados-favoritos", "/deputados/?favoritos=sim", { favoritos });
await foto("presenca", "/presenca/");
await foto("sobre", "/sobre/");
await foto("gastos", "/gastos/");
await foto("passagens", "/gastos/passagens/");
await foto("votacoes", "/votacoes/");
await foto("alertas", "/alertas/");
await foto("rede", "/rede/");
writeFileSync(path.join(destino, "erros.json"), JSON.stringify(erros, null, 2));
await b.close();
servidor.kill();
console.log("inspeção gravada em", destino);
