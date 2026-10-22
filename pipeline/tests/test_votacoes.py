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
