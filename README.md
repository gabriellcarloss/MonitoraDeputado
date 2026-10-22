# MonitoraDeputado

Painel público e gratuito que avalia os deputados federais como **funcionários públicos sob avaliação de desempenho**:
quanto custam, o que entregam, se comparecem, como votam — com o máximo de detalhe financeiro (nota a nota, passageiro
a passageiro) e cruzamentos que mostram **quem está ligado a quem**. Atualiza sozinho todos os dias.

- **Visão geral:** totais, destaques automáticos, séries mensais com picos marcados, mapa 3D por UF, quadrante custo × entrega e rankings.
- **Deputados:** lista com filtros (UF, partido, sexo, situação, faixa de gasto, alertas, troca de partido), ordenação por qualquer indicador e comparador de até 4.
- **Perfil:** boletim de desempenho com posição no ranking, pontos de atenção com evidências, gastos (categorias, fornecedores, passagens, notas fiscais com link e exportação CSV), votos, calendário de presença, proposições e rede de relações.
- **Gastos, Passagens e Fornecedor:** exploração da cota parlamentar (CEAP) com filtros; quem voou sem ser deputado; dados da Receita (abertura, situação, sócios) de cada fornecedor.
- **Votações, Presença, Proposições, Alertas, Rede e Metodologia.**

Todos os pontos de atenção são regras estatísticas transparentes, aplicadas igualmente a todos, com a evidência ao lado.
**Não constituem acusação.**

## Como funciona

```
GitHub Actions (todo dia 04:00 de Brasília)
  └─ pipeline/  Python + DuckDB: baixa as fontes públicas, cruza, calcula indicadores, picos, alertas e rede,
                valida e exporta Parquet + JSON em web/public/data/
  └─ web/       Next.js estático: lê os JSON e consulta os Parquet no navegador com DuckDB-WASM
  └─ Vercel     publica a pasta web/out
```

Se a validação falhar (fonte fora do ar sem cache, queda brusca de registros, esquema diferente), **nada é publicado**
e o site continua na versão anterior. O GitHub avisa por e-mail.

Fontes: Dados Abertos da Câmara (API v2 e arquivos anuais), arquivos da Cota Parlamentar (CEAP) e dados públicos de
CNPJ (Minha Receita / BrasilAPI). Detalhes e limitações na página **Sobre os dados** do site.

## Rodar localmente

Requisitos: [uv](https://docs.astral.sh/uv/), Node 22 e pnpm 10.

```bash
# dados reais (precisa de internet; a primeira execução demora — CNPJs são consultados aos poucos)
make data

# ou dados FICTÍCIOS de demonstração (instantâneo, sem internet)
cd web && pnpm install && pnpm fixtures

# site
cd web && pnpm dev            # http://localhost:3000
```

Testes: `make test` (pipeline + unitários do site) e `cd web && pnpm build && pnpm e2e` (navegador, temas claro e escuro).

Opções do pipeline: `cd pipeline && uv run monitora run --anos 2025,2026 --sem-cnpj --offline`.

## Publicar na Vercel (uma vez só)

1. Crie uma conta em [vercel.com](https://vercel.com) e um projeto vazio (pode ser pelo `npx vercel@62.0.0 link` dentro de `web/`).
   Em **Settings → General**, deixe *Framework Preset* como **Other** e sem comando de build — o site já chega pronto.
2. Gere um token em **Account Settings → Tokens**.
3. No GitHub, em **Settings → Secrets and variables → Actions**:
   - *Secrets*: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (os dois IDs estão em `web/.vercel/project.json` depois do `vercel link`, ou nas configurações do projeto).
   - *Variables*: `SITE_URL` com o endereço público (ex.: `https://monitoradeputado.vercel.app`).
4. Em **Actions → Atualizar dados e publicar → Run workflow** rode a primeira vez manualmente
   (marque *dados fictícios* se quiser só testar a publicação). Depois disso roda sozinho todo dia.

## Estrutura

```
pipeline/src/monitora/   extract/ (fontes)  metrics/ (indicadores, séries, alertas, rede)  validate.py  export.py  cli.py
web/src/app/             páginas
web/src/components/      gráficos, filtros, perfil, gastos…
web/src/lib/             contrato de dados (types.ts), consultas SQL (queries/), DuckDB no navegador (duck.ts)
docs/superpowers/        especificação e plano de implementação
```

## Próximas fases

2. Eventos, comissões, agenda e discursos · 3. Emendas parlamentares, equipe de gabinete, verbas e patrimônio/campanha (TSE)
· 4. Alertas por e-mail e insights com IA.
