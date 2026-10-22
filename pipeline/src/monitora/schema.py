"""Esquema das tabelas brutas do pipeline (usado por testes e dados fictícios)."""

TABELAS = """
CREATE TABLE deputados (id BIGINT, nome VARCHAR, nome_civil VARCHAR, sexo VARCHAR, uf VARCHAR, partido_atual VARCHAR,
  foto VARCHAR, email VARCHAR, gabinete VARCHAR, redes VARCHAR[], escolaridade VARCHAR, nascimento DATE, situacao VARCHAR,
  condicao_eleitoral VARCHAR, inicio_exercicio DATE, fim_exercicio DATE);
CREATE TABLE exercicios (deputado_id BIGINT, inicio DATE, fim DATE);
CREATE TABLE deputado_partidos (deputado_id BIGINT, partido VARCHAR, inicio DATE, fim DATE);
CREATE TABLE despesas (ide_documento BIGINT, deputado_id BIGINT, data DATE, ano_mes VARCHAR, categoria VARCHAR,
  especificacao VARCHAR, fornecedor VARCHAR, cnpj_cpf VARCHAR, numero_documento VARCHAR, valor_documento DOUBLE,
  valor_glosa DOUBLE, valor_liquido DOUBLE, passageiro VARCHAR, trecho VARCHAR, url_documento VARCHAR,
  passageiro_e_deputado BOOLEAN);
CREATE TABLE fornecedores (cnpj VARCHAR, razao_social VARCHAR, nome_fantasia VARCHAR, abertura DATE, situacao VARCHAR,
  cnae VARCHAR, municipio VARCHAR, uf VARCHAR, socios STRUCT(nome VARCHAR, qualificacao VARCHAR, entrada DATE)[],
  capital_social DOUBLE, sem_dados BOOLEAN);
CREATE TABLE votacoes (id VARCHAR, data DATE, sigla_orgao VARCHAR, descricao VARCHAR, aprovacao INTEGER,
  proposicao_id BIGINT, votos_sim INTEGER, votos_nao INTEGER, votos_outros INTEGER);
CREATE TABLE votos (votacao_id VARCHAR, deputado_id BIGINT, voto VARCHAR, partido_na_data VARCHAR, data DATE);
CREATE TABLE orientacoes (votacao_id VARCHAR, bancada VARCHAR, orientacao VARCHAR);
CREATE TABLE orientacao_partido (votacao_id VARCHAR, partido VARCHAR, orientacao VARCHAR, bancada VARCHAR);
CREATE TABLE sessoes (id BIGINT, data DATE, tipo VARCHAR);
CREATE TABLE presencas (sessao_id BIGINT, deputado_id BIGINT, presente BOOLEAN);
CREATE TABLE proposicoes (id BIGINT, sigla_tipo VARCHAR, numero INTEGER, ano INTEGER, ementa VARCHAR, tema VARCHAR,
  data_apresentacao DATE, situacao VARCHAR, relevante BOOLEAN, url_inteiro_teor VARCHAR);
CREATE TABLE autorias (proposicao_id BIGINT, deputado_id BIGINT, proponente_principal BOOLEAN, ordem INTEGER);
CREATE TABLE relatorias (proposicao_id BIGINT, deputado_id BIGINT, orgao VARCHAR);
"""


def criar_tabelas(con) -> None:
    con.execute(TABELAS)
