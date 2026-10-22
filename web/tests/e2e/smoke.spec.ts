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
  `/deputado/${dep}/?aba=proposicoes`, `/deputado/${dep}/?aba=rede`,
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
