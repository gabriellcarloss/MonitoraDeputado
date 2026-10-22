# MonitoraDeputado — Fase 1: Especificação de design

**Data:** 2026-10-22
**Status:** aguardando revisão
**Repositório:** github.com/gabriellcarloss/MonitoraDeputado

## 1. Objetivo

Plataforma pública, gratuita e atualizada automaticamente que avalia os 513 deputados
federais **como funcionários públicos sob avaliação de desempenho**: quanto custam,
o que entregam, como votam, se comparecem — com o máximo de detalhe financeiro e
cruzamentos que revelem "quem está envolvido com quem".

### Critérios de sucesso
- Qualquer cidadão encontra um deputado e entende em 30 segundos: custo, entrega,
  presença, comportamento de voto e pontos de atenção.
- Todo número tem caminho até o dado bruto (nota fiscal, voto, sessão).
- Atualização diária sem intervenção humana, custo de infraestrutura R$ 0.
- Funciona bem em celular, modo claro e escuro, tema Brasil.

### Restrições
- Somente dados públicos e oficiais (ou derivados públicos, ex.: CNPJ na Receita).
- Tom de alertas: "ponto de atenção", nunca acusação; cada alerta mostra regra e evidência.
- Sem backend com estado na Fase 1.

## 2. Escopo por fase

| Fase | Conteúdo |
|---|---|
| **1 (este documento)** | Deputados, gastos CEAP completos (passagens, passageiros, fornecedores), enriquecimento de CNPJ, rede de relações, votações e votos, orientação de partidos/governo, presença em sessões, proposições (autoria/relatoria), boletim de desempenho, quadrante custo × entrega, alertas por regras, séries temporais com detecção de picos |
| 2 | Eventos, comissões, reuniões, agenda, discursos, frentes parlamentares |
| 3 | Emendas parlamentares (Portal da Transparência), equipe de gabinete (secretários parlamentares), salário/verba de gabinete, patrimônio e financiamento de campanha (TSE) |
| 4 | Alertas por e-mail/assinatura, backend opcional, insights com LLM |

## 3. Arquitetura

```
GitHub Actions (cron diário 04:00 BRT)
  └─ pipeline/ (Python 3.12 + DuckDB)
       1. extract   → baixa fontes (cache incremental em actions/cache)
       2. transform → limpa, normaliza, cruza (SQL DuckDB)
       3. metrics   → indicadores, rankings, boletins, alertas, picos
       4. validate  → esquema, volumes, variações; falha = não publica
       5. export    → Parquet (fatos) + JSON (agregados leves) em web/public/data/
  └─ web/ (Next.js, output: 'export')
       next build → site estático + dados
  └─ vercel deploy --prebuilt --prod (VERCEL_TOKEN em secrets)
```

- Dados **não** são versionados no Git; só código.
- Navegador: páginas leem JSON agregado para carregamento instantâneo; consultas
  detalhadas/filtradas usam **DuckDB-WASM** sobre os Parquet (carregados sob demanda,
  HTTP range requests).
- Falha em qualquer etapa: job falha → GitHub envia e-mail → site permanece na versão anterior.
- Execução manual também disponível (`workflow_dispatch`) e local (`make data && make web`).

## 4. Fontes de dados (Fase 1)

| Domínio | Fonte | Endpoint / arquivo |
|---|---|---|
| Deputados (legislatura 57, inclui suplentes que exerceram) | API v2 Câmara | `/deputados?idLegislatura=57`, `/deputados/{id}`, `/deputados/{id}/historico` |
| Partidos, blocos, lideranças | API v2 | `/partidos`, `/blocos`, `/partidos/{id}/lideres` |
| CEAP (cota parlamentar) | Arquivos Câmara | `https://www.camara.leg.br/cotas/Ano-{AAAA}.csv.zip` (2023→atual) |
| Votações, votos, orientações | Arquivos dadosabertos | `/arquivos/votacoes/csv/votacoes-{AAAA}.csv`, `votacoesVotos-{AAAA}`, `votacoesOrientacoes-{AAAA}`, `votacoesProposicoes-{AAAA}` |
| Proposições e autores | Arquivos dadosabertos | `/arquivos/proposicoes/csv/proposicoes-{AAAA}.csv`, `proposicoesAutores-{AAAA}`, `proposicoesTemas-{AAAA}` |
| Relatorias | API v2 | `/proposicoes/{id}/relacionadas` + tramitações (campo relator) — via arquivo `proposicoes` (`ultimoStatus_uriRelator`) |
| Sessões e presença | API v2 | `/eventos?codTipoEvento=<sessões deliberativas>`, `/eventos/{id}/deputados` |
| CNPJ fornecedores | Minha Receita (`minhareceita.org`) com fallback BrasilAPI (`brasilapi.com.br/api/cnpj/v1`) | consulta por CNPJ, cache permanente; reconsulta a cada 90 dias |

Campos CEAP usados: `txNomeParlamentar, ideCadastro, sgUF, sgPartido, numAno, numMes,
txtDescricao (categoria), txtDescricaoEspecificacao, txtFornecedor, txtCNPJCPF,
txtNumero, indTipoDocumento, datEmissao, vlrDocumento, vlrGlosa, vlrLiquido,
numParcela, txtPassageiro, txtTrecho, numLote, numRessarcimento, urlDocumento, ideDocumento`.

Rate limiting: no máximo 5 req/s na API v2 e nas APIs de CNPJ, com retry exponencial.
Preferir sempre arquivos em lote à API.

## 5. Modelo de dados (Parquet)

| Tabela | Grão | Chaves principais |
|---|---|---|
| `deputados` | deputado | id, nome, nome_civil, sexo, uf, partido_atual, foto, email, gabinete, redes, escolaridade, nascimento, situacao, condicao_eleitoral |
| `deputado_partidos` | deputado × período | id, partido, inicio, fim |
| `despesas` | documento CEAP | ide_documento, deputado_id, data, ano_mes, categoria, especificacao, fornecedor, cnpj_cpf, valor_documento, valor_glosa, valor_liquido, passageiro, trecho, url_documento, passageiro_e_deputado (bool) |
| `fornecedores` | CNPJ/CPF | cnpj, razao_social, nome_fantasia, abertura, situacao, cnae, municipio, uf, socios (lista), capital_social |
| `votacoes` | votação | id, data, sigla_orgao, descricao, aprovacao, proposicao_id, votos_sim, votos_nao, votos_outros |
| `votos` | votação × deputado | votacao_id, deputado_id, voto, partido_na_data |
| `orientacoes` | votação × bancada | votacao_id, bancada, orientacao (inclui "Governo") |
| `sessoes` | sessão deliberativa | id, data, tipo |
| `presencas` | sessão × deputado | sessao_id, deputado_id, presente (bool) |
| `proposicoes` | proposição | id, sigla_tipo, numero, ano, ementa, tema, data_apresentacao, situacao, relevante (bool) |
| `autorias` | proposição × deputado | proposicao_id, deputado_id, proponente_principal (bool), ordem |
| `relatorias` | proposição × deputado | proposicao_id, deputado_id, orgao |

**Proposição "relevante"** (entrega legislativa): tipos PL, PLP, PEC, PDL, MPV-emenda
não incluída; requerimentos (REQ, RIC, INC), moções e indicações contam em métrica
separada "atividade administrativa".

## 6. Indicadores (por deputado, com recorte por período)

- **Custo:** total CEAP líquido, média mensal, % da cota da UF utilizada, gasto por categoria, top fornecedores, % concentrado no maior fornecedor.
- **Entrega:** nº proposições relevantes (autor principal e coautor), nº relatorias, nº aprovadas/transformadas em norma.
- **Presença:** % sessões deliberativas presente; % participação em votações nominais (votou / votações durante exercício).
- **Comportamento:** % alinhamento à orientação do partido; % alinhamento ao Governo; nº votos contra a bancada.
- **Eficiência:** custo por proposição relevante; custo por sessão presente.
- **Posição:** percentil e ranking geral, na UF e no partido para cada indicador.

Agregações equivalentes por partido, UF e Brasil. Denominadores consideram apenas
o período em exercício do deputado (suplentes não são penalizados).

## 7. Séries temporais e picos

- Toda métrica de gasto, voto, presença e proposição tem série **mensal** (e semanal para votações).
- Detecção de pico: mês com valor > mediana + 3×MAD da própria série (robusto) **ou** > 2,5× a média dos 12 meses anteriores. Picos viram anotações no gráfico com rótulo ("pico: 3,2× a média").
- Gráficos com zoom, comparação com média do partido/UF/Brasil e seleção de período.

## 8. Alertas (pontos de atenção)

Cada regra: id, título, severidade (info/atenção/alta), descrição da metodologia,
evidência (registros que dispararam, com link). Regras da Fase 1:

| ID | Regra |
|---|---|
| G01 | Gasto CEAP no período > 2× mediana da UF |
| G02 | Pico mensal de gasto (seção 7) |
| G03 | ≥ 50% do gasto em um único fornecedor (mínimo R$ 20 mil) |
| G04 | Passagens aéreas emitidas para passageiro ≠ deputado (contagem e valor) |
| G05 | Fornecedor com CNPJ aberto < 6 meses antes do primeiro pagamento do deputado |
| G06 | Fornecedor com situação cadastral ≠ ATIVA na data do pagamento |
| G07 | Sobrenome de sócio do fornecedor coincide com sobrenome do deputado (excluindo sobrenomes muito comuns, lista top-50 IBGE) |
| G08 | Notas com valor glosado relevante (soma glosa > R$ 5 mil) |
| G09 | Gastos em fim de semana/feriado em categorias atípicas (ex.: combustível com valor alto) |
| G10 | Mesmo fornecedor usado por ≥ 10 deputados com valores muito acima da mediana da categoria |
| P01 | Participação em votações nominais < 70% |
| P02 | Presença em sessões abaixo do percentil 10 |
| L01 | Nenhuma proposição relevante como autor principal em ≥ 12 meses de exercício |
| L02 | Quadrante "gasta muito × entrega pouco" (gasto ≥ P75 e entrega ≤ P25) |
| V01 | Votou contra a orientação do próprio partido em > 25% das votações |
| V02 | Troca de partido no mandato |

Página **Alertas** lista todos com filtros; perfil mostra selos. Rodapé de cada alerta:
"Ponto de atenção gerado automaticamente a partir de dados públicos. Não constitui acusação."

## 9. Rede de relações

Grafo (ECharts graph, força) com nós deputado / fornecedor / passageiro e arestas
ponderadas por valor. Visões:
- **Ego-rede do deputado:** seus fornecedores e passageiros, e que outros deputados compartilham os mesmos.
- **Ego-rede do fornecedor:** todos os deputados que o pagaram, sócios (Receita) e linha do tempo.
- **Passageiros recorrentes:** pessoas que voaram pela cota de mais de um deputado.
Limite de nós por visão (top 150 por valor) para desempenho; restante em tabela.

## 10. Telas

Navegação: Início · Deputados · Gastos · Votações · Presença · Proposições · Alertas · Rede · Sobre os dados.
Busca global (deputado, partido, UF, fornecedor/CNPJ, passageiro). Filtros sempre refletidos na URL.

1. **Início:** cards (gasto total no ano, média por deputado, presença média, votações, proposições, alertas ativos), série mensal de gasto com picos, série de votações, mapa do Brasil (gasto/presença/entrega por UF), quadrante custo × entrega (513 pontos, clicáveis), rankings top/bottom 10.
2. **Deputados:** lista (cards/tabela), filtros UF, partido, bloco, sexo, situação, faixa de gasto/presença/entrega, nº de alertas, trocou de partido; ordenação por qualquer métrica; comparador de até 4.
3. **Perfil (boletim):** abas Resumo (boletim + posições + alertas) · Gastos (série mensal, categorias, fornecedores, passagens com passageiro/trecho, tabela de notas com link do documento, exportação CSV) · Votações (votos, alinhamento, ausências, série) · Presença (calendário) · Proposições (lista, tipo, situação) · Rede.
4. **Gastos:** exploração geral com filtros período, UF, partido, deputado, categoria, fornecedor, passageiro; séries, rankings, tabela completa, exportação CSV. Subpágina **Passagens aéreas** (passageiros, trechos, companhias, terceiros). Subpágina **Fornecedor** (dados Receita, sócios, deputados atendidos, série).
5. **Votações:** lista com filtros; detalhe com placar, votos por partido/UF, orientações, dissidentes; série semanal de votações.
6. **Presença:** rankings com as duas medidas, série mensal, filtros.
7. **Proposições:** lista, filtros por tipo/tema/autor/situação, ranking de autores, série mensal.
8. **Alertas:** lista filtrável por regra, severidade, UF, partido.
9. **Rede:** explorador do grafo.
10. **Sobre os dados:** fontes, metodologia de cada indicador e regra, horário da última atualização, limitações conhecidas.

## 11. Visual

- Paleta Brasil: verde `#009C3B`, amarelo `#FFDF00`, azul `#002776`, branco; fundos neutros.
  Tokens CSS com variantes claro/escuro ajustadas para contraste WCAG AA (amarelo usado como destaque, nunca texto sobre branco).
- Alternância claro/escuro/sistema, persistida em localStorage.
- Responsivo (mobile-first), tabelas viram cards no celular.
- Tipografia: Inter (texto) e números tabulares.

## 12. Stack

- **Pipeline:** Python 3.12, `duckdb`, `httpx`, `polars` (onde útil), `pydantic` para esquemas, `pytest`.
- **Web:** Next.js 15 (App Router, `output: 'export'`), TypeScript, Tailwind CSS, shadcn/ui, ECharts (`echarts-for-react`), `@duckdb/duckdb-wasm`, `nuqs` (estado na URL).
- **CI/CD:** GitHub Actions (`data-and-deploy.yml` cron + manual; `ci.yml` em PR: testes + build), Vercel CLI.
- **Secrets:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

Páginas de perfil geradas estaticamente para todos os deputados (`generateStaticParams`);
fornecedores e votações renderizados no cliente a partir dos Parquet (rota única com query string).

## 13. Testes e validação

- **Pipeline:** testes unitários das transformações e de cada regra de alerta com fixtures pequenas; teste de integração com amostra real gravada.
- **Validação pré-publicação:** nº deputados entre 500 e 620; despesas do ano corrente > 0 e variação de linhas vs. execução anterior ≥ −5%; votos referenciam votações existentes; nenhum valor negativo líquido inesperado; esquema dos Parquet confere.
- **Web:** testes de componente para formatação/cálculos; Playwright smoke (todas as rotas renderizam, nos dois temas, sem erro de console) no CI.

## 14. Erros e resiliência

- Retry exponencial (até 5 tentativas) em downloads; fonte indisponível → usa cache da execução anterior e marca a fonte como "desatualizada" na página Sobre.
- CNPJ não encontrado → fornecedor marcado "sem dados da Receita"; regras G05–G07 não disparam para ele.
- Erro inesperado → job falha, sem deploy.

## 15. Fora do escopo da Fase 1

Eventos/comissões/agenda, emendas, gabinete, salários, TSE, contas de usuário,
notificações, LLM. Já previstos nas Fases 2–4.

## 16. Pré-requisitos operacionais

- Rede liberada para: `dadosabertos.camara.leg.br`, `www.camara.leg.br`, `minhareceita.org`, `brasilapi.com.br`.
- Conta Vercel e token configurado nos secrets do repositório.
- GitHub App do Claude com acesso ao repositório.
