import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const DATA = path.resolve(__dirname, "../../public/data");
const deputados = JSON.parse(fs.readFileSync(path.join(DATA, "deputados.json"), "utf8")) as { id: number }[];
const dep = deputados[0].id;
const alerta = (JSON.parse(fs.readFileSync(path.join(DATA, "alertas.json"), "utf8")) as { evidencias: { url: string | null }[] }[])
  .flatMap((a) => a.evidencias).find((e) => e.url?.startsWith("/fornecedor/"));
const cnpj = alerta?.url?.split("cnpj=")[1] ?? "00000000000000";

const ROTAS = [
  "/", "/deputados/", `/deputados/comparar/?ids=${deputados[0].id},${deputados[1].id}`,
  `/deputado/${dep}/`, `/deputado/${dep}/?aba=gastos`, `/deputado/${dep}/?aba=votacoes`, `/deputado/${dep}/?aba=presenca`,
  `/deputado/${dep}/?aba=proposicoes`, `/deputado/${dep}/?aba=rede`, `/deputado/${dep}/?aba=emendas`, `/deputado/${dep}/?aba=equipe`,
  "/deputados/?favoritos=sim", `/deputados/?lista=${deputados[0].id},${deputados[1].id}`,
  "/gastos/", "/gastos/passagens/", `/fornecedor/?cnpj=${cnpj}`, "/votacoes/", "/presenca/", "/proposicoes/",
  "/alertas/", "/rede/", "/sobre/",
];

for (const tema of ["claro", "escuro"] as const) {
  test.describe(`tema ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => { try { localStorage.setItem("tema", t); } catch {} }, tema);
    });
    for (const rota of ROTAS) {
      test(`${rota} renderiza sem erros`, async ({ page }) => {
        const erros: string[] = [];
        page.on("pageerror", (e) => erros.push(e.message));
        page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
        const r = await page.goto(rota);
        expect(r?.status()).toBe(200);
        await expect(page.locator("h1").first()).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-theme", tema === "claro" ? "light" : "dark");
        await page.waitForLoadState("networkidle");
        await expect(page.locator("main [role=alert]")).toHaveCount(0); // fora do main há o anunciador de rotas do Next
        const texto = await page.locator("main").innerText();
        expect(texto).not.toMatch(/\bNaN\b|Infinity|undefined/);
        expect(erros).toEqual([]);
      });
    }
  });
}

test("filtro inválido na URL mostra a lista completa", async ({ page }) => {
  await page.goto("/deputados/?uf=XX&partido=NAOEXISTE");
  await expect(page.getByText(`${deputados.length} deputado(s)`)).toBeVisible();
});

test("filtro válido reduz a lista e fica na URL", async ({ page }) => {
  await page.goto("/deputados/");
  await page.locator("label", { hasText: /^UF/ }).locator("select").selectOption("SP");
  await expect(page).toHaveURL(/uf=SP/);
  await expect(page.getByText(`${deputados.length} deputado(s)`)).toHaveCount(0);
});

test("perfil: notas fiscais carregam via DuckDB", async ({ page }) => {
  await page.goto(`/deputado/${dep}/?aba=gastos`);
  await expect(page.getByText(/notas · R\$/)).toBeVisible({ timeout: 30_000 });
});

test("busca global leva ao deputado", async ({ page }) => {
  const todos = JSON.parse(fs.readFileSync(path.join(DATA, "deputados.json"), "utf8")) as { id: number; nome: string }[];
  const nome = todos.find((d) => todos.filter((x) => x.nome === d.nome).length === 1)!; // nome único (dados fictícios repetem nomes)
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("combobox").first().fill(nome.nome);
  await page.getByRole("option").filter({ hasText: nome.nome }).filter({ hasNotText: "“" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/deputado/${nome.id}/`));
});

test("CSV exportado traz datas legíveis", async ({ page }) => {
  await page.goto(`/deputado/${dep}/?aba=gastos`);
  await expect(page.getByText(/notas · R\$/)).toBeVisible({ timeout: 30_000 });
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Exportar CSV/ }).click()]);
  const conteudo = fs.readFileSync((await download.path())!, "utf8");
  expect(conteudo.split("\n")[1]).toMatch(/^"\d{4}-\d{2}-\d{2}"/);
});

test("perfil sai pronto no HTML estático, com prévia de link", async ({ request }) => {
  const html = await (await request.get(`/deputado/${dep}/`)).text();
  expect(html).toContain("Boletim de desempenho");
  expect(html).toContain('property="og:description"');
  expect(html).toMatch(/<meta name="description" content="[^"]+\(/);
});

test("sitemap e robots publicados", async ({ request }) => {
  const sm = await (await request.get("/sitemap.xml")).text();
  expect(sm).toContain(`/deputado/${dep}/`);
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
});

test("meus deputados: marcar com estrela, filtrar e ver na página inicial", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/deputados/");
  const estrela = page.getByRole("button", { name: /^Marcar .* como meu deputado$/ }).first();
  const rotulo = (await estrela.getAttribute("aria-label"))!;
  const nome = rotulo.replace(/^Marcar /, "").replace(/ como meu deputado$/, "");
  await estrela.click();
  await expect(page.getByRole("button", { name: `Remover ${nome} dos meus deputados` }).first()).toBeVisible();
  await page.locator("label", { hasText: /^Meus deputados/ }).locator("select").selectOption("sim");
  await expect(page).toHaveURL(/favoritos=sim/);
  await expect(page.getByText("1 deputado(s)")).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#meus-deputados")).toBeVisible();
  await expect(page.locator("section[aria-labelledby=meus-deputados]").getByText(nome).first()).toBeVisible();
});

test("links do autor: só contato e Apuração (sem WhatsApp nem LinkedIn no menu e no rodapé)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/sobre/");
  await expect(page.locator('a[href="/contato/"]').first()).toBeVisible();
  await expect(page.locator('a[href^="https://apuracao-2026-five.vercel.app/"]').first()).toBeVisible();
  await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
  await expect(page.locator('a[href*="linkedin.com"]')).toHaveCount(0);
});
