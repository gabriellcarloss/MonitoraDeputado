import respx

from monitora.config import ARQ
from monitora.extract.proposicoes import extract_proposicoes

PROPS = '''"id";"uri";"siglaTipo";"numero";"ano";"codTipo";"descricaoTipo";"ementa";"ementaDetalhada";"keywords";"dataApresentacao";"uriOrgaoNumerador";"uriPropAnterior";"uriPropPrincipal";"uriPropPosterior";"urlInteiroTeor";"urnFinal";"ultimoStatus_dataHora";"ultimoStatus_sequencia";"ultimoStatus_uriRelator";"ultimoStatus_idOrgao";"ultimoStatus_siglaOrgao";"ultimoStatus_uriOrgao";"ultimoStatus_regime";"ultimoStatus_descricaoTramitacao";"ultimoStatus_idTipoTramitacao";"ultimoStatus_descricaoSituacao";"ultimoStatus_idSituacao";"ultimoStatus_despacho";"ultimoStatus_apreciacao";"ultimoStatus_url"
"10";"";"PEC";"5";"2024";"";"";"Altera a Constituição";"";"";"2024-02-10T10:00:00";"";"";"";"";"https://teor/10";"";"";"";"https://dadosabertos.camara.leg.br/api/v2/deputados/2";"";"CCJC";"";"";"";"";"Aguardando Parecer";"";"";"";""
"11";"";"REQ";"7";"2024";"";"";"Requer informações";"";"";"2024-03-01T10:00:00";"";"";"";"";"";"";"";"";"";"";"";"";"";"";"";"Arquivada";"";"";"";""
'''
AUTORES = '''"idProposicao";"uriProposicao";"idDeputadoAutor";"uriAutor";"codTipoAutor";"tipoAutor";"nomeAutor";"siglaPartidoAutor";"uriPartidoAutor";"siglaUFAutor";"ordemAssinatura";"proponente"
"10";"";"1";"";"10000";"Deputado";"Ana";"AAA";"";"SP";"1";"1"
"10";"";"2";"";"10000";"Deputado";"Beto";"BBB";"";"RJ";"2";"1"
"10";"";"";"";"40000";"Senado";"Senado Federal";"";"";"";"3";"1"
"11";"";"2";"";"10000";"Deputado";"Beto";"BBB";"";"RJ";"1";"1"
'''
TEMAS = '''"uriProposicao";"siglaTipo";"numero";"ano";"codTema";"tema";"relevancia"
"https://dadosabertos.camara.leg.br/api/v2/proposicoes/10";"PEC";"5";"2024";"1";"Saúde";"0"
'''


def carregar(con, client, tmp_path):
    with respx.mock:
        respx.get(f"{ARQ}/proposicoes/csv/proposicoes-2024.csv").respond(200, text=PROPS)
        respx.get(f"{ARQ}/proposicoesAutores/csv/proposicoesAutores-2024.csv").respond(200, text=AUTORES)
        respx.get(f"{ARQ}/proposicoesTemas/csv/proposicoesTemas-2024.csv").respond(200, text=TEMAS)
        extract_proposicoes(client, con, [2024], cache_dir=tmp_path)


def test_relevante_por_tipo(con, client, tmp_path):
    carregar(con, client, tmp_path)
    assert dict(con.execute("SELECT sigla_tipo, relevante FROM proposicoes").fetchall()) == {"PEC": True, "REQ": False}
    assert con.execute("SELECT tema, situacao FROM proposicoes WHERE id=10").fetchone() == ("Saúde", "Aguardando Parecer")


def test_autor_principal_ordem_1(con, client, tmp_path):
    carregar(con, client, tmp_path)
    rows = con.execute("SELECT deputado_id, proponente_principal FROM autorias WHERE proposicao_id=10 ORDER BY 1").fetchall()
    assert rows == [(1, True), (2, False)]


def test_relator_id_da_uri(con, client, tmp_path):
    carregar(con, client, tmp_path)
    assert con.execute("SELECT proposicao_id, deputado_id, orgao FROM relatorias").fetchall() == [(10, 2, "CCJC")]


def test_autor_nao_deputado_ignorado(con, client, tmp_path):
    carregar(con, client, tmp_path)
    assert con.execute("SELECT count(*) FROM autorias").fetchone()[0] == 3
