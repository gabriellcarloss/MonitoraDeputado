# MonitoraDeputado Fase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Painel público, estático e atualizado diariamente que avalia os deputados federais (custo, entrega, presença, votos, alertas, rede de relações).

**Architecture:** Pipeline Python + DuckDB (em `pipeline/`) baixa fontes públicas, gera Parquet + JSON em `web/public/data/`; site Next.js exportado estaticamente (em `web/`) lê JSON agregado e consulta Parquet via DuckDB-WASM; GitHub Actions roda tudo diariamente e publica na Vercel.

**Tech Stack:** Python ≥3.12, duckdb, httpx, pydantic, pytest, uv · Next.js 15 (App Router, `output: 'export'`), TypeScript, Tailwind, shadcn/ui, echarts + echarts-for-react, @duckdb/duckdb-wasm, nuqs, vitest, Playwright · GitHub Actions, Vercel CLI.

**Spec:** `docs/superpowers/specs/2026-10-22-monitora-deputado-fase1-design.md`

## Global Constraints

- Somente dados públicos; todo número rastreável até o registro bruto (link `url_documento`, id de votação, id de sessão).
- Legislatura 57 (2023-02-01 → 2027-01-31); anos de dados: 2023 até o ano corrente.
- Rate limit: ≤ 5 req/s por host; retry exponencial até 5 tentativas.
- Dados nunca commitados (`web/public/data/` e `pipeline/.cache/` no `.gitignore`).
- Cores: verde `#009C3B`, amarelo `#FFDF00`, azul `#002776`; contraste WCAG AA; amarelo nunca como texto sobre branco.
- Rodapé de todo alerta, texto exato: "Ponto de atenção gerado automaticamente a partir de dados públicos. Não constitui acusação."
- Proposição relevante = `sigla_tipo ∈ {PL, PLP, PEC, PDL}`.
- Denominadores de presença/votações consideram só o período em exercício do deputado.
- Interface 100% em português do Brasil; datas `dd/mm/aaaa`; moeda `R$ 1.234,56`.
- Commits terminam com as linhas de atribuição da sessão.

## Review Focus

1. **Deputado sem nenhum gasto/voto/proposição (suplente recém-empossado)** → perfil renderiza com "sem registros no período", nunca NaN/Infinity (custo por proposição com 0 proposições = "—"). Teste em Task 9 e Task 17.
2. **CSV da Câmara com encoding/separador inesperado (`;`, UTF-8 com BOM, vírgula decimal)** → parse correto. Teste em Task 3 e Task 4.
3. **Fonte fora do ar em uma execução** → usa cache anterior e marca fonte como desatualizada em `meta.json`; não publica se não houver cache. Teste em Task 2 e Task 13.
4. **Passageiro com grafia diferente do nome do deputado (acentos, nome civil vs. parlamentar, caixa)** → `passageiro_e_deputado` compara normalizado contra nome parlamentar E nome civil, aceitando correspondência de primeiro+último nome. Teste em Task 4.
5. **Filtros na URL inválidos ou de UF/partido inexistente** → página ignora o valor inválido e mostra todos, sem quebrar. Teste em Task 16.

---

## File Structure

```
.gitignore  Makefile  README.md
pipeline/
  pyproject.toml
  src/monitora/
    __init__.py
    config.py          # constantes: anos, URLs, legislatura, paths
    http.py            # cliente com cache, rate limit, retry
    db.py              # conexão DuckDB e helpers SQL
    normalize.py       # normalização de nomes/CNPJ/texto
    extract/deputados.py  extract/ceap.py  extract/votacoes.py
    extract/proposicoes.py  extract/presencas.py  extract/cnpj.py
    metrics/indicadores.py  metrics/series.py  metrics/alertas.py  metrics/rede.py
    validate.py  export.py  cli.py
  tests/  (um arquivo por módulo + fixtures/)
web/
  package.json  next.config.ts  tailwind.config.ts  playwright.config.ts
  src/app/            # rotas (seção 10 da spec)
  src/components/     # layout/, charts/, ui/ (shadcn), deputado/, filtros/
  src/lib/            # data.ts, duck.ts, format.ts, filters.ts, types.ts
  tests/unit/  tests/e2e/
.github/workflows/ci.yml  .github/workflows/data-and-deploy.yml
```

## Data contract (produced by pipeline, consumed by web)

`web/public/data/`:
- `meta.json` — `{gerado_em: ISO, fontes: {nome: {atualizado_em, desatualizada: bool}}, anos: number[]}`
- `deputados.json` — `DeputadoResumo[]` (todos os campos de `deputados` + `indicadores` + `posicoes` + `n_alertas`)
- `brasil.json` — agregados Brasil/UF/partido + séries mensais Brasil
- `alertas.json` — `Alerta[]`
- `deputado/{id}.json` — `{deputado, indicadores, posicoes, series, alertas, top_fornecedores, proposicoes, rede}`
- `parquet/{despesas,fornecedores,votacoes,votos,orientacoes,sessoes,presencas,proposicoes,autorias,relatorias,rede_arestas}.parquet`

Types (Python dataclasses ↔ `web/src/lib/types.ts`, same snake_case field names):
- `Indicadores`: `gasto_total, gasto_medio_mensal, pct_cota_usada, pct_maior_fornecedor, n_proposicoes_relevantes, n_proposicoes_coautor, n_requerimentos, n_relatorias, n_aprovadas, pct_presenca_sessoes, pct_participacao_votacoes, pct_alinhamento_partido, pct_alinhamento_governo, n_votos_contra_bancada, custo_por_proposicao (float|null), custo_por_sessao (float|null), meses_exercicio`
- `Posicoes`: `{[indicador]: {brasil: int, uf: int, partido: int, percentil: float}}`
- `Serie`: `{metrica: str, pontos: [{periodo: 'AAAA-MM', valor: float}], picos: [{periodo, valor, fator: float, rotulo: str}]}`
- `Alerta`: `{id: str, regra: str, deputado_id: int, severidade: 'info'|'atencao'|'alta', titulo: str, descricao: str, evidencias: [{tipo: str, ref: str, valor: float|null, url: str|null}]}`

---

### Task 1: Repo scaffold + HTTP client with cache

**Files:** Create `.gitignore`, `Makefile`, `pipeline/pyproject.toml`, `pipeline/src/monitora/{__init__,config,http,db,normalize}.py`, `pipeline/tests/test_http.py`, `pipeline/tests/test_normalize.py`

**Interfaces — Produces:**
- `config.ANOS: list[int]` (2023..ano corrente), `config.LEGISLATURA = 57`, `config.CACHE_DIR: Path` (`pipeline/.cache`), `config.OUT_DIR: Path` (`web/public/data`), URL constants: `API = "https://dadosabertos.camara.leg.br/api/v2"`, `ARQ = "https://dadosabertos.camara.leg.br/arquivos"`, `CEAP_URL = "https://www.camara.leg.br/cotas/Ano-{ano}.csv.zip"`.
- `http.Client(rate_per_host: float = 5.0, retries: int = 5)` with `get_json(url, params=None) -> dict`, `get_all_pages(url, params) -> list[dict]` (segue `links.rel=next` da API v2), `download(url, dest: Path, max_age_hours: float) -> Path` (reusa se arquivo existe e é mais novo que max_age; em falha de rede com cache existente devolve cache e registra `http.stale_sources`), `stale_sources: set[str]`.
- `db.connect(path: Path | None = None) -> duckdb.DuckDBPyConnection`.
- `normalize.nome(s: str) -> str` (sem acento, maiúsculas, espaços colapsados), `normalize.cnpj(s: str) -> str | None` (só dígitos; 14 dígitos = CNPJ, 11 = CPF, senão None), `normalize.mesmo_nome(a: str, b: str) -> bool` (igual normalizado OU mesmo primeiro e último token).

- [ ] **Step 1:** Write tests: `test_download_uses_cache_when_fresh`, `test_download_falls_back_to_stale_cache_on_error` (asserts path returned and host in `stale_sources`), `test_download_raises_without_cache`, `test_get_all_pages_follows_next` (usar `respx`), `test_retry_on_503_then_success`; `test_nome_strips_accents` (`"José  da Silva"`→`"JOSE DA SILVA"`), `test_cnpj_variants` (`"12.345.678/0001-90"`→`"12345678000190"`, `"123"`→None), `test_mesmo_nome` (`("Zé Silva","ZE DA SILVA")`→True, `("Ana Souza","Ana Lima")`→False).
- [ ] **Step 2:** `cd pipeline && uv run pytest -q` → FAIL (módulos inexistentes).
- [ ] **Step 3:** Implement. pyproject: deps `duckdb, httpx, pydantic, python-dateutil`; dev `pytest, respx`. Rate limit por host com `time.monotonic` token bucket. Makefile targets: `data` (`cd pipeline && uv run monitora run`), `test` (pytest + web vitest), `web` (`cd web && pnpm build`).
- [ ] **Step 4:** `uv run pytest -q` → PASS.
- [ ] **Step 5:** Commit `chore: scaffold do pipeline e cliente HTTP com cache`.

### Task 2: Extract deputados e partidos

**Files:** Create `extract/deputados.py`, `tests/test_deputados.py`, `tests/fixtures/deputados_*.json`

**Interfaces — Consumes:** `http.Client`, `db.connect`. **Produces:** `extract_deputados(client, con) -> None` criando tabelas DuckDB `deputados` e `deputado_partidos` com as colunas da spec §5 (+ `nome_civil`, `inicio_exercicio`, `fim_exercicio` derivados do `/historico`: períodos com `situacao='Exercício'`).

- [ ] **Step 1:** Tests com `respx` servindo fixtures (2 deputados, um titular e um suplente que exerceu 2024-03→2024-09, com troca de partido): `test_tabela_deputados_colunas`, `test_suplente_periodo_exercicio`, `test_troca_partido_gera_dois_periodos`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: `/deputados?idLegislatura=57` (todas as páginas) → para cada id `/deputados/{id}` e `/deputados/{id}/historico`. Redes sociais como `list[str]`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(pipeline): extração de deputados e histórico partidário`.

### Task 3: Extract CEAP → tabela despesas

**Files:** Create `extract/ceap.py`, `tests/test_ceap.py`, `tests/fixtures/Ano-2024.csv.zip` (gerado no teste a partir de CSV inline de 6 linhas)

**Interfaces — Produces:** `extract_ceap(client, con, anos: list[int]) -> None` → tabela `despesas` (colunas spec §5). Mapeamento: `ideDocumento→ide_documento, ideCadastro→deputado_id, datEmissao→data, txtDescricao→categoria, txtDescricaoEspecificacao→especificacao, txtFornecedor→fornecedor, txtCNPJCPF→cnpj_cpf (normalize.cnpj), vlrDocumento/vlrGlosa/vlrLiquido→valor_*, txtPassageiro→passageiro, txtTrecho→trecho, urlDocumento→url_documento`. `ano_mes` = `numAno-numMes` (não `datEmissao`, que pode faltar). Linhas com `ideCadastro` nulo (lideranças) excluídas.

- [ ] **Step 1:** Tests: `test_parse_csv_semicolon_bom_decimal_virgula` (CSV `;`, BOM, `"1.234,56"`→1234.56 e também `"1234.56"`), `test_ano_mes_from_numano_nummes`, `test_exclui_liderancas`, `test_valor_liquido_negativo_preservado` (estornos são legítimos).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: download zip (max_age 20h para ano corrente, 30 dias para anteriores), `duckdb.read_csv` com `delim=';'`, `all_varchar=true`, conversões em SQL.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(pipeline): extração completa da CEAP`.

### Task 4: Passageiros e flag `passageiro_e_deputado`

**Files:** Modify `extract/ceap.py`; Test `tests/test_ceap.py`

**Interfaces — Consumes:** tabelas `despesas`, `deputados`; `normalize.mesmo_nome`. **Produces:** coluna `despesas.passageiro_e_deputado: BOOLEAN | NULL` (NULL quando `passageiro` vazio).

- [ ] **Step 1:** Tests: `test_passageiro_igual_nome_parlamentar`, `test_passageiro_igual_nome_civil_sem_acento` (`"JOAO CARLOS DE SOUZA"` vs civil `"João Carlos de Souza"`), `test_passageiro_terceiro_false`, `test_sem_passageiro_null`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement `marcar_passageiros(con)` (UDF Python registrada no DuckDB). **Step 4:** PASS. **Step 5:** Commit `feat(pipeline): identificação de passagens para terceiros`.

### Task 5: Extract votações, votos, orientações

**Files:** Create `extract/votacoes.py`, `tests/test_votacoes.py`

**Interfaces — Produces:** `extract_votacoes(client, con, anos) -> None` → tabelas `votacoes`, `votos`, `orientacoes` (spec §5) de `{ARQ}/votacoes/csv/votacoes-{ano}.csv`, `votacoesVotos-{ano}`, `votacoesOrientacoes-{ano}`, `votacoesProposicoes-{ano}` (para `proposicao_id`). Apenas votações nominais (que têm votos). `orientacoes.bancada` normalizado; governo = bancada contendo `"GOV"`→`"Governo"`.

- [ ] **Step 1:** Tests: `test_somente_votacoes_nominais`, `test_partido_na_data_vem_do_voto`, `test_orientacao_governo_normalizada`, `test_votos_referenciam_votacoes`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5:** Commit `feat(pipeline): votações, votos e orientações`.

### Task 6: Extract proposições, autorias, relatorias

**Files:** Create `extract/proposicoes.py`, `tests/test_proposicoes.py`

**Interfaces — Produces:** `extract_proposicoes(client, con, anos) -> None` → tabelas `proposicoes` (com `relevante = sigla_tipo IN ('PL','PLP','PEC','PDL')`), `autorias` (de `proposicoesAutores-{ano}`; `proponente_principal = ordemAssinatura = 1`; só autores com `idDeputadoAutor`), `relatorias` (de `ultimoStatus_uriRelator`, id extraído do fim da URI). Tema principal de `proposicoesTemas-{ano}`.

- [ ] **Step 1:** Tests: `test_relevante_por_tipo` (REQ→False, PEC→True), `test_autor_principal_ordem_1`, `test_relator_id_da_uri`, `test_autor_nao_deputado_ignorado`.
- [ ] **Step 2–5:** FAIL → implement → PASS → commit `feat(pipeline): proposições, autorias e relatorias`.

### Task 7: Extract sessões e presenças

**Files:** Create `extract/presencas.py`, `tests/test_presencas.py`

**Interfaces — Produces:** `extract_presencas(client, con, desde: date) -> None` → tabelas `sessoes`, `presencas`. `/eventos?codTipoEvento=<códigos>&dataInicio=..&dataFim=..` (descobrir os códigos de Sessão Deliberativa em `/referencias/eventos/codTipoEvento` e usar os de tipo "Sessão Deliberativa" — guardar lista em `config.TIPOS_SESSAO_DELIBERATIVA`), só eventos com `situacao` "Encerrada"; `/eventos/{id}/deputados` → presentes. Ausentes = deputados em exercício na data e não presentes. Incremental: sessões já no cache (`CACHE_DIR/sessoes/{id}.json`) não são rebaixadas.

- [ ] **Step 1:** Tests: `test_ausente_quando_em_exercicio_e_nao_listado`, `test_fora_do_exercicio_nao_conta`, `test_sessao_cancelada_ignorada`, `test_incremental_nao_rebaixa`.
- [ ] **Step 2–5:** FAIL → implement → PASS → commit `feat(pipeline): presença em sessões deliberativas`.

### Task 8: Enriquecimento de CNPJ

**Files:** Create `extract/cnpj.py`, `tests/test_cnpj.py`

**Interfaces — Produces:** `enrich_cnpj(client, con, max_novos: int = 3000) -> None` → tabela `fornecedores` (spec §5; `socios: list[{nome, qualificacao, entrada}]`). Fonte `https://minhareceita.org/{cnpj}`, fallback `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`. Cache permanente em `CACHE_DIR/cnpj/{cnpj}.json` com `consultado_em`; reconsulta se > 90 dias. Prioriza CNPJs por valor total pago (desc), limitado a `max_novos` consultas por execução (o resto entra nas próximas). 404 em ambas → registro com `sem_dados=True`.

- [ ] **Step 1:** Tests: `test_usa_cache_menor_90_dias`, `test_fallback_brasilapi`, `test_404_marca_sem_dados`, `test_prioriza_maior_valor_e_respeita_limite`, `test_cpf_nao_consulta`.
- [ ] **Step 2–5:** FAIL → implement → PASS → commit `feat(pipeline): enriquecimento de fornecedores com dados da Receita`.

### Task 9: Indicadores e posições

**Files:** Create `metrics/indicadores.py`, `tests/test_indicadores.py`

**Interfaces — Produces:** `calcular_indicadores(con, inicio: date, fim: date) -> None` → tabela `indicadores` (um registro por deputado, campos de `Indicadores`) e `posicoes`; `agregados(con) -> dict` (Brasil, por UF, por partido: médias/medianas de cada indicador). Regras:
- `pct_cota_usada` = gasto / (cota mensal da UF × meses_exercicio); tabela `config.COTA_MENSAL_UF: dict[str, float]` com os valores do Ato da Mesa vigente (preencher do site da Câmara na implementação; fonte citada em comentário).
- `pct_participacao_votacoes` = votos registrados (exceto "Artigo 17") / votações nominais no Plenário ocorridas em dias de exercício.
- Alinhamento: só votações em que a bancada orientou Sim/Não; voto = orientação.
- `custo_por_*` = None quando denominador 0.
- Posição 1 = maior valor, exceto para indicadores "quanto menor melhor" (gasto, custo, pct_maior_fornecedor) onde 1 = menor; percentil 0–100.

- [ ] **Step 1:** Tests: `test_suplente_sem_registros_indicadores_zero_e_custos_none`, `test_participacao_ignora_votacoes_fora_exercicio`, `test_alinhamento_ignora_liberado`, `test_posicao_inversa_para_gasto`, `test_agregados_por_uf`.
- [ ] **Step 2–5:** FAIL → implement → PASS → commit `feat(pipeline): indicadores de desempenho e rankings`.

### Task 10: Séries mensais e picos

**Files:** Create `metrics/series.py`, `tests/test_series.py`

**Interfaces — Produces:** `detectar_picos(pontos: list[tuple[str, float]]) -> list[Pico]`; `gerar_series(con) -> None` → tabela `series(escopo, chave, metrica, periodo, valor)` com escopo ∈ {brasil, uf, partido, deputado, fornecedor} e métricas `gasto, votacoes, presenca, proposicoes` (+ série semanal `votacoes_semana` só para brasil).
Pico: valor > mediana + 3×MAD **ou** > 2,5× média dos 12 pontos anteriores (exige ≥ 6 anteriores); `fator` = valor / média dos 12 anteriores (ou /mediana se < 6); `rotulo` = `f"pico: {fator:.1f}× a média"` com vírgula decimal (`"3,2×"`). Meses sem dados preenchidos com 0 entre o primeiro e o último mês.

- [ ] **Step 1:** Tests: `test_pico_mad`, `test_pico_media_12m`, `test_serie_constante_sem_pico`, `test_rotulo_virgula`, `test_preenche_meses_vazios`.
- [ ] **Step 2–5:** FAIL → implement → PASS → commit `feat(pipeline): séries temporais e detecção de picos`.

### Task 11: Regras de alerta

**Files:** Create `metrics/alertas.py`, `tests/test_alertas.py`

**Interfaces — Consumes:** tabelas de Tasks 3–10. **Produces:** `REGRAS: dict[str, Regra]` (`Regra(id, titulo, severidade, descricao, fn: Callable[[con], list[Alerta]])`) e `gerar_alertas(con) -> list[Alerta]`. Implementar as 16 regras exatamente com os limiares da spec §8 (G01–G10, P01, P02, L01, L02, V01, V02). Detalhes que a spec deixa abertos:
- G07: lista `config.SOBRENOMES_COMUNS` (50 mais comuns do Brasil: SILVA, SANTOS, OLIVEIRA, SOUZA, …) excluída; comparar último sobrenome.
- G09: fim de semana/feriados nacionais (`config.FERIADOS` fixos + Carnaval/Sexta Santa/Corpus Christi calculados) e categoria combustível com valor > P95 da categoria.
- G10: "muito acima" = mediana do fornecedor > 2× mediana da categoria.
- Severidade: `alta` para G04 (≥ 5 passagens), G05, G06, G07, L02; `atencao` para os demais; `info` para V02.
- Evidência: `url` = `url_documento` para notas; link interno `/votacao?id=` para votos; `/fornecedor?cnpj=` para fornecedores.

- [ ] **Step 1:** Um teste por regra, nomeado `test_<id>_dispara` e `test_<id>_nao_dispara` (32 testes), sobre fixtures mínimas montadas em DuckDB em memória (`tests/conftest.py` fornece `con_vazio()` com todas as tabelas criadas vazias).
- [ ] **Step 2–5:** FAIL → implement → PASS → commit `feat(pipeline): 16 regras de pontos de atenção`.

### Task 12: Rede de relações

**Files:** Create `metrics/rede.py`, `tests/test_rede.py`

**Interfaces — Produces:** `gerar_rede(con) -> None` → tabela `rede_arestas(origem_tipo, origem_id, destino_tipo, destino_id, valor, n)` com tipos `deputado|fornecedor|passageiro|socio`; arestas deputado→fornecedor (soma valor líquido), deputado→passageiro (só `passageiro_e_deputado = false`; id = nome normalizado), fornecedor→socio. `ego_rede(con, tipo, id, limite=150) -> {nos, arestas}` (top por valor; inclui outros deputados ligados aos mesmos fornecedores/passageiros).

- [ ] **Step 1:** Tests: `test_aresta_soma_valores`, `test_passageiro_deputado_excluido`, `test_ego_inclui_deputado_que_compartilha_fornecedor`, `test_limite_nos`.
- [ ] **Step 2–5:** FAIL → implement → PASS → commit `feat(pipeline): rede deputados–fornecedores–passageiros`.

### Task 13: Validação, export e CLI

**Files:** Create `validate.py`, `export.py`, `cli.py`, `tests/test_validate.py`, `tests/test_export.py`, `tests/test_cli.py`

**Interfaces — Produces:**
- `validar(con, anterior: dict | None) -> list[str]` (lista de erros; vazia = OK) com as checagens da spec §13; `anterior` = `meta.json` da execução anterior (contagens).
- `exportar(con, out_dir: Path, stale: set[str]) -> None` escrevendo o data contract completo (JSON com `ensure_ascii=False`; Parquet zstd).
- CLI `monitora run [--anos 2023,2024] [--sem-cnpj] [--offline]` encadeia Tasks 2–12 → validar → exportar; exit 1 se validação falhar (nada escrito em `out_dir`: escrever em diretório temporário e renomear no fim). `--offline` usa só cache.
- Script entry point `monitora = "monitora.cli:main"`.

- [ ] **Step 1:** Tests: `test_validacao_falha_poucos_deputados`, `test_validacao_falha_queda_despesas_maior_5pct`, `test_export_escreve_todos_arquivos` (lista exata do data contract), `test_export_json_sem_nan` (`custo_por_proposicao` None → `null`), `test_cli_falha_nao_sobrescreve_saida_anterior`, `test_meta_marca_fonte_desatualizada`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Execução real (requer rede liberada): `make data` → conferir `ls web/public/data` e contagens impressas (≈ 513 deputados em exercício, despesas do ano > 0). Se a rede estiver bloqueada, registrar no relatório e seguir.
- [ ] **Step 6:** Commit `feat(pipeline): validação, exportação e CLI`.

### Task 14: Web scaffold, tema Brasil e layout

**Files:** Create `web/` (Next.js 15 + TS + Tailwind + shadcn/ui init), `web/src/app/layout.tsx`, `web/src/app/globals.css`, `web/src/components/layout/{Header,Nav,ThemeToggle,Footer,BuscaGlobal}.tsx`, `web/src/lib/format.ts`, `web/tests/unit/format.test.ts`

**Interfaces — Produces:**
- CSS tokens em `:root` e `.dark`: `--verde #009C3B`, `--amarelo #FFDF00`, `--azul #002776`, `--bg`, `--fg`, `--muted`, `--card`, `--border`, `--alerta-info|atencao|alta`; dark: fundos `#0b1220`-ish, verde clareado para AA.
- `ThemeToggle` (claro/escuro/sistema, `localStorage` em try/catch, script anti-flash no `<head>`).
- `format.ts`: `brl(v: number) -> "R$ 1.234,56"`, `pct(v: number, casas=1) -> "12,3%"`, `data(iso) -> "dd/mm/aaaa"`, `mes(periodo 'AAAA-MM') -> "jan/2025"`, `num(v) -> "1.234"`, `ouTraco(v: number|null, f) -> f(v) | "—"`.
- Nav com as rotas da spec §10; header com última atualização (lê `meta.json`).
- `next.config.ts`: `output: 'export'`, `images.unoptimized: true`, `trailingSlash: true`.

- [ ] **Step 1:** Vitest: `brl(1234.56)`→`"R$ 1.234,56"`, `pct(0.1234)`→`"12,3%"`, `mes("2025-01")`→`"jan/2025"`, `ouTraco(null, brl)`→`"—"`, `ouTraco(Infinity, brl)`→`"—"`.
- [ ] **Step 2–4:** FAIL → implement → PASS; `pnpm build` gera `out/`.
- [ ] **Step 5:** Commit `feat(web): scaffold, tema Brasil e modo claro/escuro`.

### Task 15: Camada de dados (JSON + DuckDB-WASM) e fixtures de desenvolvimento

**Files:** Create `web/src/lib/{types,data,duck}.ts`, `web/scripts/gerar-fixtures.ts`, `web/tests/unit/duck.test.ts`

**Interfaces — Produces:**
- `types.ts` espelhando o data contract.
- `data.ts` (build-time, server): `getMeta()`, `getDeputados()`, `getBrasil()`, `getAlertas()`, `getDeputado(id)`, `getDeputadoIds()` lendo `public/data`.
- `duck.ts` (client): `useDuck()` hook → `{query<T>(sql: string, params?: unknown[]): Promise<T[]>, ready: boolean, error?: string}`; registra os Parquet por URL (`/data/parquet/*.parquet`) como views com o mesmo nome da tabela; inicialização única (singleton) e lazy.
- `gerar-fixtures.ts`: gera `public/data` sintético (20 deputados, 2 anos) quando não há dados reais — usado em dev e CI. `pnpm fixtures`.

- [ ] **Step 1:** Vitest: `getDeputado` de id inexistente → `null`; `duck` em Node (`@duckdb/duckdb-wasm` blocking build) consulta `despesas` das fixtures e soma bate com `brasil.json`.
- [ ] **Step 2–5:** FAIL → implement → PASS → commit `feat(web): camada de dados e fixtures de desenvolvimento`.

### Task 16: Componentes de gráfico e filtros

**Files:** Create `web/src/components/charts/{SerieTemporal,MapaBrasil,Quadrante,Barras,Rede,Donut}.tsx`, `web/public/geo/br-uf.json` (GeoJSON UFs do IBGE, simplificado), `web/src/components/filtros/{Filtros,useFiltros}.tsx`, `web/src/lib/filters.ts`, `web/tests/unit/filters.test.ts`

**Interfaces — Produces:**
- `SerieTemporal({series: Serie[], comparar?: Serie[], altura?})` — linhas com `dataZoom`, `markPoint` nos picos (rótulo do pico), tooltip formatado BRL/num.
- `MapaBrasil({valores: Record<UF, number>, formato, onClick(uf)})`.
- `Quadrante({pontos: {id, nome, x, y, partido, uf}[], xLabel, yLabel, onClick(id)})` — linhas de mediana dividindo os 4 quadrantes; quadrante "gasta muito × entrega pouco" destacado.
- `Rede({nos, arestas, onClick})` — force layout, cor por tipo.
- Cores dos gráficos vêm dos tokens CSS (lidos via `getComputedStyle`), re-render ao trocar tema.
- `filters.ts`: `parseFiltros(searchParams, opcoes: {ufs, partidos}) -> Filtros` descartando valores inválidos; `useFiltros()` via `nuqs` (estado na URL).

- [ ] **Step 1:** Vitest: `parseFiltros({uf:'XX', partido:'PT'})` com `ufs` válidas → `{uf: undefined, partido:'PT'}`; período `inicio > fim` → troca; `faixa_gasto` não numérica → ignorada.
- [ ] **Step 2–5:** FAIL → implement → PASS → commit `feat(web): gráficos (série com picos, mapa, quadrante, rede) e filtros na URL`.

### Task 17: Início, Deputados (lista + comparador) e Perfil (boletim)

**Files:** Create `web/src/app/page.tsx`, `web/src/app/deputados/page.tsx`, `web/src/app/deputados/comparar/page.tsx`, `web/src/app/deputado/[id]/page.tsx` (+ abas em `web/src/components/deputado/{Resumo,Gastos,Votacoes,Presenca,Proposicoes,RedeTab,Boletim,SeloAlerta}.tsx`), `web/tests/unit/boletim.test.tsx`

**Interfaces — Consumes:** Tasks 14–16. Conteúdo exatamente como spec §10 itens 1–3. Perfil gerado com `generateStaticParams` a partir de `getDeputadoIds()`; abas como query `?aba=gastos`. Aba Gastos e Votações consultam Parquet via `useDuck` filtrando `deputado_id`. Tabela de notas: colunas data, categoria, fornecedor (link para `/fornecedor?cnpj=`), passageiro (badge "terceiro" se `passageiro_e_deputado=false`), trecho, valor, glosa, documento (link `url_documento`); exportar CSV (gerado no cliente).

- [ ] **Step 1:** Testing-library: `Boletim` com indicadores de suplente sem registros mostra "—" para custos e "sem registros no período", sem "NaN"; `SeloAlerta` mostra o rodapé exato da spec.
- [ ] **Step 2–4:** FAIL → implement → PASS; `pnpm build` com fixtures.
- [ ] **Step 5:** Commit `feat(web): início, lista de deputados, comparador e boletim`.

### Task 18: Gastos, Passagens e Fornecedor

**Files:** Create `web/src/app/gastos/page.tsx`, `web/src/app/gastos/passagens/page.tsx`, `web/src/app/fornecedor/page.tsx`, `web/src/lib/queries/gastos.ts`, `web/tests/unit/queries-gastos.test.ts`

**Interfaces — Produces:** `queries/gastos.ts` funções que retornam SQL + params a partir de `Filtros`: `sqlSerieMensal(f)`, `sqlPorCategoria(f)`, `sqlTopFornecedores(f, n)`, `sqlNotas(f, limite, offset)`, `sqlPassagens(f)`, `sqlPassageirosTerceiros(f)`, `sqlFornecedor(cnpj)`. Conteúdo conforme spec §10 item 4; fornecedor mostra dados da Receita, sócios, série e ego-rede.

- [ ] **Step 1:** Vitest com DuckDB blocking sobre fixtures: soma de `sqlPorCategoria` com filtro UF = soma direta; `sqlPassageirosTerceiros` só retorna `passageiro_e_deputado=false`; filtros usam parâmetros (nenhum valor interpolado na string SQL).
- [ ] **Step 2–5:** FAIL → implement → PASS → commit `feat(web): exploração de gastos, passagens e fornecedores`.

### Task 19: Votações, Presença, Proposições

**Files:** Create `web/src/app/{votacoes,votacao,presenca,proposicoes}/page.tsx`, `web/src/lib/queries/{votacoes,presenca,proposicoes}.ts`, `web/tests/unit/queries-votacoes.test.ts`

Conteúdo conforme spec §10 itens 5–7. Detalhe de votação em `/votacao?id=` (placar, votos por partido e UF, orientações, dissidentes = voto ≠ orientação do próprio partido).

- [ ] **Step 1:** Vitest: dissidentes calculados corretamente numa votação de fixture; ranking de presença ordena e respeita filtro de partido.
- [ ] **Step 2–5:** FAIL → implement → PASS → commit `feat(web): votações, presença e proposições`.

### Task 20: Alertas, Rede, Sobre os dados

**Files:** Create `web/src/app/{alertas,rede,sobre}/page.tsx`, `web/src/content/metodologia.ts`

`metodologia.ts` exporta textos de cada indicador (spec §6) e de cada regra (gerados a partir do mesmo id/descrição que o pipeline exporta em `alertas.json`/`meta.json` — a página Sobre lista regras a partir de `meta.json.regras`, para nunca divergir). Página Sobre mostra fontes com `atualizado_em` e selo "desatualizada".

- [ ] **Step 1:** Adicionar `regras: [{id,titulo,severidade,descricao}]` em `meta.json` (pipeline `export.py`, com teste `test_meta_lista_16_regras`).
- [ ] **Step 2–4:** FAIL → implement → PASS (pytest + `pnpm build`).
- [ ] **Step 5:** Commit `feat: páginas de alertas, rede e metodologia`.

### Task 21: E2E smoke, CI e deploy automático

**Files:** Create `web/playwright.config.ts`, `web/tests/e2e/smoke.spec.ts`, `.github/workflows/ci.yml`, `.github/workflows/data-and-deploy.yml`, `README.md`

- `smoke.spec.ts`: para cada rota da spec §10 (com um id de deputado/fornecedor/votação das fixtures) em tema claro e escuro: status 200, sem erro de console, `h1` visível; filtro inválido na URL (`/deputados?uf=XX`) renderiza lista completa. Servidor: `npx serve out`. Playwright usa `executablePath: '/opt/pw-browsers/chromium'` quando `PW_CHROMIUM` definido.
- `ci.yml` (pull_request + push main): pytest; `pnpm fixtures && pnpm test && pnpm build && pnpm e2e`.
- `data-and-deploy.yml`: `schedule: cron '0 7 * * *'` (04:00 BRT) + `workflow_dispatch`; `actions/cache` para `pipeline/.cache` (chave por data, restore-keys prefixo); baixa `meta.json` publicado atual (`curl $SITE_URL/data/meta.json`) para validação comparativa; `make data`; `pnpm build`; `vercel pull --yes --environment=production && vercel build --prod && vercel deploy --prebuilt --prod` com secrets `VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID` e var `SITE_URL`. Job falha → sem deploy.
- `README.md`: o que é, como rodar local (`make data`, `cd web && pnpm dev`), como configurar Vercel e secrets (passo a passo), como forçar atualização manual, metodologia resumida com link para `/sobre`.

- [ ] **Step 1:** Write `smoke.spec.ts`. **Step 2:** `pnpm e2e` → PASS em fixtures.
- [ ] **Step 3:** Validar workflows com `actionlint` (via `go run` ou binário) → sem erros.
- [ ] **Step 4:** Commit `ci: testes, smoke e2e e atualização diária com deploy na Vercel`.
