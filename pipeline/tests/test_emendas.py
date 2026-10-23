import io
import zipfile

import respx

from conftest import deputado
from monitora.config import EMENDAS_URL
from monitora.extract.emendas import chave_nome, extract_emendas, uf_sigla

H1 = ('"Código da Emenda";"Ano da Emenda";"Tipo de Emenda";"Código do Autor da Emenda";"Nome do Autor da Emenda";'
      '"Número da emenda";"Localidade de aplicação do recurso";"Código Município IBGE";"Município";"Código UF IBGE";"UF";'
      '"Região";"Código Função";"Nome Função";"Valor Empenhado";"Valor Liquidado";"Valor Pago";'
      '"Valor Restos A Pagar Inscritos";"Valor Restos A Pagar Cancelados";"Valor Restos A Pagar Pagos"')


def linha(cod, ano, tipo, autor, mun, uf, fun, emp, pago):
    return (f'"{cod}";"{ano}";"{tipo}";"1";"{autor}";"1";"{mun} - {uf}";"1";"{mun}";"1";"{uf}";"N";"1";"{fun}";'
            f'"{emp}";"0,00";"{pago}";"0,00";"0,00";"0,00"')


PRINCIPAL = "\r\n".join([
    H1,
    linha("a1", "2025", "Emenda Individual - Transferências Especiais", "PR. JOÃO EXEMPLO", "MANAUS", "AMAZONAS", "Saúde",
          "3.000.000,00", "1.000.000,50"),
    linha("a2", "2024", "Emenda Individual - Transferências com Finalidade Definida", "PR. JOÃO EXEMPLO", "BELÉM", "PA",
          "Urbanismo", "2.000.000,00", "2.000.000,00"),
    linha("a3", "2023", "Emenda Individual - Transferências Especiais", "PR. JOÃO EXEMPLO", "MANAUS", "AMAZONAS", "Saúde",
          "9.000.000,00", "0,00"),  # orçamento de 2023: legislatura anterior
    linha("b1", "2025", "Emenda de Bancada", "BANCADA DO AMAZONAS", "MANAUS", "AMAZONAS", "Saúde", "9,00", "0,00"),
    linha("c1", "2025", "Emenda Individual - Transferências Especiais", "SENADOR QUALQUER", "X", "SP", "Saúde", "9,00", "0,00"),
]) + "\r\n"
H2 = ('"Código da Emenda";"Código do Autor da Emenda";"Nome do Autor da Emenda";"Número da emenda";"Tipo de Emenda";'
      '"Ano/Mês";"Código do Favorecido";"Favorecido";"Natureza Jurídica";"Tipo Favorecido";"UF Favorecido";'
      '"Município Favorecido";"Valor Recebido"')
FAV = "\r\n".join([
    H2,
    '"a1";"1";"PR. JOÃO EXEMPLO";"1";"Pix";"202603";"0001";"MUNICÍPIO DE MANAUS";"Município";"Pessoa Jurídica";"AM";"MANAUS";"900.000,00"',
    '"a1";"1";"PR. JOÃO EXEMPLO";"1";"Pix";"202605";"0002";"ONG X";"Associação Privada";"Pessoa Jurídica";"AM";"MANAUS";"100.000,50"',
    '"b1";"1";"BANCADA DO AMAZONAS";"1";"x";"202605";"0003";"OUTRO";"Município";"Pessoa Jurídica";"AM";"MANAUS";"5,00"',
]) + "\r\n"


def _zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("20261020_EmendasParlamentares.csv", PRINCIPAL.encode("latin-1"))
        z.writestr("20261020_EmendasParlamentares_PorFavorecido.csv", FAV.encode("latin-1"))
    return buf.getvalue()


def test_chave_nome_e_uf():
    assert chave_nome("Pr. João Exemplo") == chave_nome("PR. JOÃO EXEMPLO") == "PR JOAO EXEMPLO"
    assert uf_sigla("AMAZONAS") == "AM" and uf_sigla("pa") == "PA" and uf_sigla("NACIONAL") is None


def test_extract_emendas(base, client, tmp_path):
    deputado(base, 1, nome="Pr. João Exemplo", uf="AM")
    deputado(base, 2, nome="Outra Pessoa")
    with respx.mock(assert_all_called=False) as m:
        m.get(EMENDAS_URL).respond(200, content=_zip())
        extract_emendas(client, base, cache_dir=tmp_path)
    rows = base.execute("SELECT codigo, ano, deputado_id, uf, empenhado, pago, pix FROM emendas ORDER BY codigo").fetchall()
    assert rows == [("a1", 2025, 1, "AM", 3_000_000.0, 1_000_000.5, True), ("a2", 2024, 1, "PA", 2_000_000.0, 2_000_000.0, False)]
    fav = base.execute("SELECT favorecido, natureza, valor FROM emendas_favorecidos ORDER BY valor DESC").fetchall()
    assert fav == [("MUNICÍPIO DE MANAUS", "Município", 900_000.0), ("ONG X", "Associação Privada", 100_000.5)]


def test_zip_invalido_nao_quebra(base, client, tmp_path):
    deputado(base, 1)
    with respx.mock(assert_all_called=False) as m:
        m.get(EMENDAS_URL).respond(200, content=b"nao e zip")
        extract_emendas(client, base, cache_dir=tmp_path)
    assert base.execute("SELECT count(*) FROM emendas").fetchone()[0] == 0
