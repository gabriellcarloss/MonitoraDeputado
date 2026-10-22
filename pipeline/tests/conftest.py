import pytest

from monitora import db
from monitora.schema import TABELAS
from monitora.http import Client


@pytest.fixture
def con():
    c = db.connect()
    yield c
    c.close()


@pytest.fixture
def client():
    return Client(rate_per_host=10_000, backoff=0, retries=2)



@pytest.fixture
def base(con):
    """Conexão com todas as tabelas do pipeline criadas vazias."""
    con.execute(TABELAS)
    return con


def deputado(con, id_, nome="Dep", uf="SP", partido="AAA", inicio="2023-02-01", fim=None, nome_civil=None):
    con.execute("INSERT INTO deputados (id, nome, nome_civil, uf, partido_atual) VALUES (?, ?, ?, ?, ?)",
                [id_, nome, nome_civil or nome, uf, partido])
    con.execute("INSERT INTO exercicios VALUES (?, ?, ?)", [id_, inicio, fim])
