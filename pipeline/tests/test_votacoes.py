import respx

from monitora.config import ARQ
from monitora.extract.votacoes import extract_votacoes

VOTACOES = '''"id";"uri";"data";"dataHoraRegistro";"siglaOrgao";"uriOrgao";"uriEvento";"proposicaoObjeto";"uriProposicaoObjeto";"descricao";"aprovacao";"votosSim";"votosNao";"votosOutros"
"100-1";"";"2024-03-05";"2024-03-05T18:00:00";"PLEN";"";"";"";"";"Aprovado o PL 1/2024";"1";"300";"100";"5"
"100-2";"";"2024-03-06";"2024-03-06T18:00:00";"PLEN";"";"";"";"";"Votação simbólica";"1";"0";"0";"0"
'''
VOTOS = '''"idVotacao";"uriVotacao";"dataHoraVoto";"voto";"deputado_id";"deputado_uri";"deputado_nome";"deputado_siglaPartido";"deputado_uriPartido";"deputado_siglaUf";"deputado_idLegislatura";"deputado_urlFoto"
"100-1";"";"2024-03-05T18:01:00";"Sim";"1";"";"Ana";"AAA";"";"SP";"57";""
"100-1";"";"2024-03-05T18:02:00";"Não";"2";"";"Beto";"BBB";"";"RJ";"57";""
"999-9";"";"2024-03-05T18:02:00";"Não";"2";"";"Beto";"BBB";"";"RJ";"57";""
'''
ORIENT = '''"idVotacao";"uriVotacao";"siglaOrgao";"descricao";"siglaBancada";"uriBancada";"orientacao"
"100-1";"";"PLEN";"";"AAA";"";"Sim"
"100-1";"";"PLEN";"";"GOV.";"";"Não"
"100-1";"";"PLEN";"";"Governo";"";"Não"
'''
PROPS = '''"idVotacao";"uriVotacao";"data";"descricao";"proposicao_id";"proposicao_uri";"proposicao_titulo";"proposicao_ementa";"proposicao_codTipo";"proposicao_siglaTipo";"proposicao_numero";"proposicao_ano"
"100-1";"";"2024-03-05";"";"555";"";"PL 1/2024";"";"139";"PL";"1";"2024"
'''


def carregar(con, client, tmp_path):
    with respx.mock:
        respx.get(f"{ARQ}/votacoes/csv/votacoes-2024.csv").respond(200, text=VOTACOES)
        respx.get(f"{ARQ}/votacoesVotos/csv/votacoesVotos-2024.csv").respond(200, text=VOTOS)
        respx.get(f"{ARQ}/votacoesOrientacoes/csv/votacoesOrientacoes-2024.csv").respond(200, text=ORIENT)
        respx.get(f"{ARQ}/votacoesProposicoes/csv/votacoesProposicoes-2024.csv").respond(200, text=PROPS)
        extract_votacoes(client, con, [2024], cache_dir=tmp_path)


def test_somente_votacoes_nominais(con, client, tmp_path):
    carregar(con, client, tmp_path)
    assert con.execute("SELECT id, proposicao_id, votos_sim FROM votacoes").fetchall() == [("100-1", 555, 300)]


def test_partido_na_data_vem_do_voto(con, client, tmp_path):
    carregar(con, client, tmp_path)
    assert con.execute("SELECT partido_na_data FROM votos WHERE deputado_id=2").fetchone()[0] == "BBB"


def test_orientacao_governo_normalizada(con, client, tmp_path):
    carregar(con, client, tmp_path)
    rows = con.execute("SELECT bancada, orientacao FROM orientacoes ORDER BY bancada").fetchall()
    assert rows == [("AAA", "Sim"), ("Governo", "Não")]


def test_votos_referenciam_votacoes(con, client, tmp_path):
    carregar(con, client, tmp_path)
    assert con.execute("SELECT count(*) FROM votos WHERE votacao_id NOT IN (SELECT id FROM votacoes)").fetchone()[0] == 0
    assert con.execute("SELECT count(*) FROM votos").fetchone()[0] == 2


def test_arquivo_do_ano_corrente_inexistente_e_ignorado(con, client, tmp_path):
    from datetime import date
    ano = date.today().year
    with respx.mock:
        for n, txt in (("votacoes", VOTACOES), ("votacoesVotos", VOTOS), ("votacoesOrientacoes", ORIENT), ("votacoesProposicoes", PROPS)):
            respx.get(f"{ARQ}/{n}/csv/{n}-2024.csv").respond(200, text=txt)
            respx.get(f"{ARQ}/{n}/csv/{n}-{ano}.csv").respond(404)
        extract_votacoes(client, con, [2024, ano], cache_dir=tmp_path)
    assert con.execute("SELECT count(*) FROM votacoes").fetchone()[0] == 1


def _orientacoes_reais(con):
    from monitora.schema import criar_tabelas
    criar_tabelas(con)
    con.execute("""INSERT INTO votos VALUES ('v1', 1, 'Sim', 'PT', NULL), ('v1', 2, 'Não', 'PCdoB', NULL),
        ('v1', 3, 'Sim', 'PP', NULL), ('v1', 4, 'Não', 'PTB', NULL), ('v1', 5, 'Sim', 'UNIÃO', NULL), ('v1', 6, 'Sim', 'PL', NULL)""")
    con.execute("""INSERT INTO orientacoes VALUES ('v1', 'Fdr PT-PCdoB-PV', 'Sim'), ('v1', 'Bl UniãoPpPdtPsb', 'Não'),
        ('v1', 'PL', 'Não'), ('v1', 'Bl PlRepublicanos', 'Sim'), ('v1', 'Governo', 'Sim'), ('v1', 'Minoria', 'Não')""")


def test_orientacao_de_federacao_e_bloco_resolvida_por_partido(con):
    from monitora.extract.votacoes import resolver_orientacoes
    _orientacoes_reais(con)
    resolver_orientacoes(con)
    o = dict(con.execute("SELECT partido, orientacao FROM orientacao_partido WHERE votacao_id='v1'").fetchall())
    assert o["PT"] == "Sim" and o["PCdoB"] == "Sim"   # federação
    assert o["PP"] == "Não" and o["UNIÃO"] == "Não"   # bloco em CamelCase, com acento
    assert o["PL"] == "Não"                           # orientação do próprio partido vence a do bloco
    assert "PTB" not in o                             # PT não casa com PTB


def test_alinhamento_usa_orientacao_da_federacao(con):
    from datetime import date
    from conftest import deputado
    from monitora.extract.votacoes import resolver_orientacoes
    from monitora.metrics.indicadores import calcular_indicadores
    _orientacoes_reais(con)
    con.execute("INSERT INTO votacoes (id, data, sigla_orgao) VALUES ('v1', '2024-03-01', 'PLEN')")
    deputado(con, 2, partido="PCdoB")
    resolver_orientacoes(con)
    calcular_indicadores(con, date(2023, 2, 1), date(2024, 12, 31))
    assert con.execute("SELECT pct_alinhamento_partido, n_votos_contra_bancada FROM indicadores WHERE deputado_id=2").fetchone() == (0.0, 1)
