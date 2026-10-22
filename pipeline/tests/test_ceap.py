import io
import zipfile

import respx

from monitora.config import CEAP_URL
from monitora.extract.ceap import extract_ceap, marcar_passageiros

HEADER = ('"txNomeParlamentar";"cpf";"ideCadastro";"nuCarteiraParlamentar";"nuLegislatura";"sgUF";"sgPartido";'
          '"codLegislatura";"numSubCota";"txtDescricao";"numEspecificacaoSubCota";"txtDescricaoEspecificacao";'
          '"txtFornecedor";"txtCNPJCPF";"txtNumero";"indTipoDocumento";"datEmissao";"vlrDocumento";"vlrGlosa";'
          '"vlrLiquido";"numMes";"numAno";"numParcela";"txtPassageiro";"txtTrecho";"numLote";"numRessarcimento";'
          '"datPagamentoRestituicao";"vlrRestituicao";"nuDeputadoId";"ideDocumento";"urlDocumento"')


def linha(dep_id, nome, cat, forn, cnpj, emissao, vdoc, vglosa, vliq, mes, ano, ide, passageiro="", trecho=""):
    return (f'"{nome}";"";"{dep_id}";"1";"2023";"SP";"AAA";"57";"1";"{cat}";"0";"";"{forn}";"{cnpj}";"N1";"0";'
            f'"{emissao}";"{vdoc}";"{vglosa}";"{vliq}";"{mes}";"{ano}";"0";"{passageiro}";"{trecho}";"1";"";"";"";'
            f'"9";"{ide}";"https://www.camara.leg.br/cota-parlamentar/documentos/publ/{ide}.pdf"')


LINHAS = [
    linha(1, "Ana Titular", "PASSAGEM AÉREA - SIGEPA", "GOL", "07.575.651/0001-59", "2024-03-10T00:00:00", "1.234,56", "0", "1.234,56", 3, 2024, 101, "ANA MARIA TITULAR", "BSB/GRU"),
    linha(1, "Ana Titular", "PASSAGEM AÉREA - SIGEPA", "GOL", "07575651000159", "2024-03-11T00:00:00", "800.00", "0", "800.00", 3, 2024, 102, "CARLOS TERCEIRO", "BSB/GRU"),
    linha(1, "Ana Titular", "COMBUSTÍVEIS E LUBRIFICANTES.", "POSTO X", "11.111.111/0001-11", "", "300.5", "50", "250.5", 4, 2024, 103),
    linha(1, "Ana Titular", "PASSAGEM AÉREA - REEMBOLSO", "LATAM", "02012862000160", "2024-05-01T00:00:00", "-200.00", "0", "-200.00", 5, 2024, 104, "Ana Titular", "GRU/BSB"),
    linha("", "LIDERANÇA DO AAA", "TELEFONIA", "OPERADORA", "22222222000122", "2024-03-01T00:00:00", "99.90", "0", "99.90", 3, 2024, 105),
]


def zip_bytes(texto: str, bom=True) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("Ano-2024.csv", ("﻿" if bom else "") + texto)
    return buf.getvalue()


def carregar(con, client, tmp_path, linhas=LINHAS):
    with respx.mock:
        respx.get(CEAP_URL.format(ano=2024)).respond(200, content=zip_bytes("\n".join([HEADER, *linhas]) + "\n"))
        extract_ceap(client, con, [2024], cache_dir=tmp_path)


def test_parse_csv_semicolon_bom_decimal_virgula(con, client, tmp_path):
    carregar(con, client, tmp_path)
    vals = dict(con.execute("SELECT ide_documento, valor_documento FROM despesas").fetchall())
    assert vals[101] == 1234.56
    assert vals[102] == 800.0
    assert vals[103] == 300.5
    assert con.execute("SELECT cnpj_cpf FROM despesas WHERE ide_documento=101").fetchone()[0] == "07575651000159"


def test_ano_mes_from_numano_nummes(con, client, tmp_path):
    carregar(con, client, tmp_path)
    assert con.execute("SELECT ano_mes, data FROM despesas WHERE ide_documento=103").fetchone() == ("2024-04", None)


def test_exclui_liderancas(con, client, tmp_path):
    carregar(con, client, tmp_path)
    assert con.execute("SELECT count(*) FROM despesas").fetchone()[0] == 4


def test_valor_liquido_negativo_preservado(con, client, tmp_path):
    carregar(con, client, tmp_path)
    assert con.execute("SELECT valor_liquido FROM despesas WHERE ide_documento=104").fetchone()[0] == -200.0


def _com_deputados(con, client, tmp_path):
    carregar(con, client, tmp_path)
    con.execute("CREATE TABLE deputados (id BIGINT, nome VARCHAR, nome_civil VARCHAR)")
    con.execute("INSERT INTO deputados VALUES (1, 'Ana Titular', 'Ana Maria Títular')")
    marcar_passageiros(con)
    return dict(con.execute("SELECT ide_documento, passageiro_e_deputado FROM despesas").fetchall())


def test_passageiro_igual_nome_parlamentar(con, client, tmp_path):
    assert _com_deputados(con, client, tmp_path)[104] is True


def test_passageiro_igual_nome_civil_sem_acento(con, client, tmp_path):
    assert _com_deputados(con, client, tmp_path)[101] is True


def test_passageiro_terceiro_false(con, client, tmp_path):
    assert _com_deputados(con, client, tmp_path)[102] is False


def test_sem_passageiro_null(con, client, tmp_path):
    assert _com_deputados(con, client, tmp_path)[103] is None
