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


def test_db_carregar_linhas_em_massa():
    from monitora import db
    con = db.connect()
    con.execute("CREATE TABLE t (a BIGINT, b VARCHAR, c BOOLEAN)")
    db.inserir(con, "t", [(i, f"x;\"{i}", i % 2 == 0) for i in range(5000)] + [(None, None, None)])
    assert con.execute("SELECT count(*), sum(a), count(*) FILTER (c) FROM t").fetchone() == (5001, sum(range(5000)), 2500)
    assert con.execute("SELECT b FROM t WHERE a = 7").fetchone()[0] == 'x;"7'
