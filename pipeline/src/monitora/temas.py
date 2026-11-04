"""Temas das votações e das proposições.

Os temas oficiais da Câmara (cerca de 40 rótulos, só em parte das proposições) são agrupados em poucos temas amplos,
que servem de filtro e de gráfico no site. Quando não há tema oficial, o tema sai de palavras-chave da ementa (ou da
descrição da votação). Votações herdam o tema da proposição votada. Nada é inventado: sem pista, o tema é "Outros".
"""
import logging
import re

import duckdb

from monitora import db
from monitora.normalize import nome

log = logging.getLogger(__name__)

OUTROS = "Outros"
PROCESSO = "Processo legislativo"

# (tema amplo, trechos do tema oficial da Câmara, palavras-chave na ementa). Tudo em MAIÚSCULAS e sem acento.
# A ordem desempata: o primeiro tema da lista vence quando a pontuação é igual.
REGRAS: list[tuple[str, tuple[str, ...], tuple[str, ...]]] = [
    ("Saúde", ("SAUDE",),
     ("SAUDE", "SUS", "HOSPITAL", "MEDIC", "MEDICAMENTO", "VACINA", "DOENCA", "PACIENTE", "CANCER", "PLANO DE SAUDE", "ANVISA", "ENFERMAG", "FARMAC", "CLINIC", "TRATAMENTO")),
    ("Educação", ("EDUCACAO",),
     ("EDUCACAO", "ESCOLA", "ENSINO", "PROFESSOR", "ALUNO", "ESTUDANTE", "UNIVERSIDADE", "CRECHE", "FUNDEB", "ALFABETIZ", "CURRICUL", "MATRICULA")),
    ("Segurança pública e penal", ("DIREITO PENAL", "DEFESA E SEGURANCA", "SEGURANCA PUBLICA"),
     ("CODIGO PENAL", "CRIME", "PENA ", "PENAS", "PRISAO", "POLICIA", "POLICIAL", "ARMA", "ARMAMENTO", "VIOLENCIA", "HOMICIDIO", "TRAFICO", "PRESIDIO", "SEGURANCA PUBLICA", "PENAL", "FEMINICIDIO", "FACCAO", "MILICIA")),
    ("Economia, tributos e orçamento", ("ECONOMIA", "FINANCAS PUBLICAS", "INDUSTRIA, COMERCIO", "ORCAMENTO", "TRIBUT"),
     ("TRIBUT", "IMPOSTO", "ICMS", "IPI", "IRPF", "CONTRIBUICAO", "ORCAMENT", "LEI DE DIRETRIZES", "CREDITO", "BANCO", "FINANCEIR", "FISCAL", "TAXA ", "TARIFA", "COMERCIO", "EMPRESA", "MICROEMPRESA", "SIMPLES NACIONAL", "INFLACAO", "DIVIDA", "MOEDA", "CONSUMIDOR")),
    ("Trabalho e previdência", ("TRABALHO", "PREVIDENCIA", "ASSISTENCIA SOCIAL"),
     ("TRABALHO", "TRABALHADOR", "EMPREGO", "EMPREGADO", "CLT", "SALARIO", "SALARIO MINIMO", "APOSENTAD", "PREVIDENC", "INSS", "BENEFICIO", "SINDICATO", "FGTS", "ASSISTENCIA SOCIAL", "BOLSA FAMILIA")),
    ("Meio ambiente e energia", ("MEIO AMBIENTE", "ENERGIA"),
     ("MEIO AMBIENTE", "AMBIENTAL", "CLIMA", "DESMATAMENTO", "FLORESTA", "POLUICAO", "RESIDUOS", "SANEAMENTO", "AGUA", "ENERGIA", "ELETRIC", "PETROLEO", "GAS NATURAL", "MINERACAO", "BIODIVERS", "FAUNA", "FLORA", "RECURSOS HIDRICOS", "RENOVAVEL")),
    ("Agropecuária e terra", ("AGRICULTURA", "ESTRUTURA FUNDIARIA"),
     ("AGRICOLA", "AGRICULTUR", "AGROPECUAR", "RURAL", "PRODUTOR RURAL", "PECUARIA", "AGRONEGOCIO", "AGROTOXICO", "REFORMA AGRARIA", "TERRA", "FUNDIARI", "PESCA", "SAFRA", "INDIGENA", "QUILOMBOLA", "DEMARCACAO")),
    ("Infraestrutura, transporte e cidades", ("VIACAO", "CIDADES", "TRANSPORTE"),
     ("TRANSPORTE", "RODOVIA", "FERROVIA", "AEROPORTO", "PORTO", "TRANSITO", "VEICULO", "MOTORISTA", "HABITACAO", "MORADIA", "URBAN", "MOBILIDADE", "OBRAS", "INFRAESTRUTURA", "CODIGO DE TRANSITO", "AVIACAO")),
    ("Direitos humanos, família e minorias", ("DIREITOS HUMANOS", "FAMILIA"),
     ("DIREITOS HUMANOS", "MULHER", "MULHERES", "CRIANCA", "ADOLESCENTE", "IDOSO", "PESSOA COM DEFICIENCIA", "DEFICIENCIA", "RACIAL", "RACISMO", "DISCRIMINACAO", "LGBT", "IGUALDADE", "FAMILIA", "MATERN", "GESTANTE", "VITIMA", "REFUGIAD", "MIGRANTE")),
    ("Política, eleições e partidos", ("POLITICA, PARTIDOS",),
     ("ELEITORAL", "ELEICAO", "ELEICOES", "PARTIDO", "CAMPANHA ELEITORAL", "VOTO ", "MANDATO", "REFORMA POLITICA", "COLIGACAO", "FUNDO PARTIDARIO", "SUFRAGIO", "DOMICILIO ELEITORAL")),
    ("Administração pública e servidores", ("ADMINISTRACAO PUBLICA",),
     ("ADMINISTRACAO PUBLICA", "SERVIDOR", "SERVIDORES", "CONCURSO", "LICITACAO", "CONTRATOS ADMINISTRATIVOS", "MUNICIP", "ESTADOS E MUNICIPIOS", "FEDERACAO", "PACTO FEDERATIVO", "AUTARQUIA", "FUNDACAO", "IMPROBIDADE", "CARGOS", "REMUNERACAO")),
    ("Justiça e direito", ("DIREITO CIVIL", "DIREITO E JUSTICA", "DIREITO CONSTITUCIONAL", "DIREITO E DEFESA DO CONSUMIDOR", "DIREITO"),
     ("CODIGO CIVIL", "PROCESSO CIVIL", "JUDICIARIO", "TRIBUNAL", "JUIZ", "JUSTICA", "STF", "CONSTITUCION", "CARTORIO", "ADVOCACIA", "ADVOGADO", "DEFENSORIA", "MINISTERIO PUBLICO", "HERANCA", "CONTRATO")),
    ("Ciência, tecnologia e comunicações", ("CIENCIA", "COMUNICACOES"),
     ("TECNOLOGIA", "INTERNET", "DIGITAL", "INTELIGENCIA ARTIFICIAL", "DADOS PESSOAIS", "LGPD", "TELECOM", "TELEFONIA", "RADIODIFUSAO", "TELEVISAO", "IMPRENSA", "COMUNICACAO", "INOVACAO", "PESQUISA", "CIBERNET", "REDES SOCIAIS")),
    ("Cultura, esporte e turismo", ("ARTE, CULTURA", "ESPORTE", "TURISMO"),
     ("CULTURA", "CULTURAL", "ESPORTE", "ESPORTIV", "FUTEBOL", "TURISMO", "TURISTIC", "ARTISTA", "PATRIMONIO HISTORICO", "RELIGIAO", "RELIGIOS", "IGREJA", "MUSEU", "CINEMA", "MUSICA", "AUDIOVISUAL", "LAZER")),
    ("Defesa e relações exteriores", ("RELACOES INTERNACIONAIS",),
     ("FORCAS ARMADAS", "EXERCITO", "MARINHA", "AERONAUTICA", "DEFESA NACIONAL", "ACORDO", "TRATADO", "CONVENCAO", "RELACOES EXTERIORES", "INTERNACIONAL", "MERCOSUL", "EXTERIOR", "FRONTEIRA", "MILITAR")),
    ("Homenagens e datas", ("HOMENAGENS",),
     ("DENOMINA", "INSTITUI O DIA", "DIA NACIONAL", "SEMANA NACIONAL", "HOMENAGEM", "TITULO DE", "CAPITAL NACIONAL", "INSCREVE O NOME", "LIVRO DOS HEROIS", "DATA COMEMORATIVA")),
]

TEMAS = [r[0] for r in REGRAS] + [PROCESSO, OUTROS]

# Votações sem assunto próprio (só andamento da sessão).
_PROCEDIMENTO = ("REQUERIMENTO DE URGENCIA", "RETIRADA DE PAUTA", "ADIAMENTO", "ENCERRAMENTO DA DISCUSSAO", "DESTAQUE",
                 "REQUERIMENTO DE INVERSAO", "PREJUDICIALIDADE", "QUESTAO DE ORDEM", "EMENDA DE REDACAO", "SESSAO", "REGIME DE URGENCIA",
                 "VOTACAO EM SEPARADO", "SUBEMENDA", "SUBSTITUTIVO", "PAUTA", "OBSTRUCAO")

_OFICIAIS_POR_TEMA = [(t, tuple(o)) for t, o, _ in REGRAS]


def _alvo(texto: str | None) -> str:
    return f" {nome(texto)} " if texto else ""


def tema_oficial(oficial: str | None) -> str | None:
    """Tema amplo correspondente ao tema oficial da Câmara; None se não reconhecido."""
    n = nome(oficial)
    if not n:
        return None
    if "PROCESSO LEGISLATIVO" in n:
        return PROCESSO
    for tema, trechos in _OFICIAIS_POR_TEMA:
        if any(t in n for t in trechos):
            return tema
    return None


def tema_por_texto(texto: str | None) -> str | None:
    """Tema amplo pela maior quantidade de palavras-chave distintas no texto; None se nenhuma aparece."""
    alvo = _alvo(texto)
    if not alvo.strip():
        return None
    melhor, pontos = None, 0
    for tema, _, palavras in REGRAS:
        p = sum(1 for w in palavras if re.search(rf"(?<![A-Z]){re.escape(w)}", alvo))
        if p > pontos:
            melhor, pontos = tema, p
    return melhor


def classificar(texto: str | None, oficial: str | None = None) -> str:
    return tema_oficial(oficial) or tema_por_texto(texto) or OUTROS


def classificar_votacao(descricao: str | None, tema_proposicao: str | None, ementa: str | None) -> str:
    if tema_proposicao and tema_proposicao not in (OUTROS,):
        return tema_proposicao
    t = tema_por_texto(f"{ementa or ''} {descricao or ''}")
    if t:
        return t
    alvo = _alvo(descricao)
    return PROCESSO if any(p in alvo for p in _PROCEDIMENTO) else OUTROS


def aplicar_temas(con: duckdb.DuckDBPyConnection) -> None:
    """Preenche proposicoes.tema (amplo; o oficial fica em tema_oficial) e votacoes.tema."""
    cols = {r[0] for r in con.execute("DESCRIBE proposicoes").fetchall()}
    if "tema_oficial" not in cols:
        con.execute("ALTER TABLE proposicoes ADD COLUMN tema_oficial VARCHAR")
        con.execute("UPDATE proposicoes SET tema_oficial = tema")
    props = con.execute("SELECT id, ementa, tema_oficial FROM proposicoes").fetchall()
    amplo = {i: classificar(e, o) for i, e, o in props}
    _atualizar_em_lote(con, "proposicoes", amplo)

    vcols = {r[0] for r in con.execute("DESCRIBE votacoes").fetchall()}
    if "tema" not in vcols:
        con.execute("ALTER TABLE votacoes ADD COLUMN tema VARCHAR")
    ementas = {i: e for i, e, _ in props}
    vots = con.execute("SELECT id, descricao, proposicao_id FROM votacoes").fetchall()
    por_voto = {vid: classificar_votacao(desc, amplo.get(pid), ementas.get(pid)) for vid, desc, pid in vots}
    _atualizar_em_lote(con, "votacoes", por_voto)
    log.info("temas: %d proposições, %d votações", len(amplo), len(por_voto))


def _atualizar_em_lote(con: duckdb.DuckDBPyConnection, tabela: str, valores: dict) -> None:
    """UPDATE de muitas linhas de uma vez (executemany é lento no DuckDB): tabela temporária + junção."""
    if not valores:
        return
    tipo = "BIGINT" if tabela == "proposicoes" else "VARCHAR"
    con.execute(f"CREATE OR REPLACE TEMP TABLE _tema (id {tipo}, tema VARCHAR)")
    db.inserir(con, "_tema", list(valores.items()))
    con.execute(f"UPDATE {tabela} SET tema = t.tema FROM _tema t WHERE {tabela}.id = t.id")
    con.execute("DROP TABLE _tema")
