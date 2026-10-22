from monitora import normalize


def test_nome_strips_accents():
    assert normalize.nome("José  da Silva") == "JOSE DA SILVA"
    assert normalize.nome(None) == ""


def test_cnpj_variants():
    assert normalize.cnpj("12.345.678/0001-90") == "12345678000190"
    assert normalize.cnpj("123.456.789-01") == "12345678901"
    assert normalize.cnpj("123") is None
    assert normalize.cnpj(None) is None


def test_mesmo_nome():
    assert normalize.mesmo_nome("Zé Silva", "ZE DA SILVA")
    assert normalize.mesmo_nome("joão carlos de souza", "JOAO CARLOS DE SOUZA")
    assert not normalize.mesmo_nome("Ana Souza", "Ana Lima")
    assert not normalize.mesmo_nome("", "Ana Lima")
