import respx

from monitora.config import API
from monitora.extract.deputados import extract_deputados

LISTA = {"dados": [
    {"id": 1, "nome": "Ana Titular", "siglaPartido": "AAA", "siglaUf": "SP", "idLegislatura": 57},
    {"id": 2, "nome": "Beto Suplente", "siglaPartido": "BBB", "siglaUf": "RJ", "idLegislatura": 57},
], "links": []}


def detalhe(id_, nome, civil, partido, uf, situacao, sexo):
    return {"dados": {
        "id": id_, "nomeCivil": civil, "sexo": sexo, "dataNascimento": "1970-05-01",
        "escolaridade": "Superior", "redeSocial": ["https://x.com/a"],
        "ultimoStatus": {"nome": nome, "siglaPartido": partido, "siglaUf": uf, "urlFoto": f"https://f/{id_}.jpg",
                         "email": f"dep{id_}@camara.leg.br", "situacao": situacao, "condicaoEleitoral": "Titular",
                         "gabinete": {"nome": "101", "predio": "4", "sala": "101", "andar": "1", "telefone": "3215-0000"}},
    }}


HIST_1 = {"dados": [
    {"dataHora": "2019-02-01T00:00", "idLegislatura": 56, "siglaPartido": "ZZZ", "situacao": "Exercício"},
    {"dataHora": "2023-02-01T00:00", "idLegislatura": 57, "siglaPartido": "AAA", "situacao": "Exercício"},
    {"dataHora": "2024-04-05T10:00", "idLegislatura": 57, "siglaPartido": "CCC", "situacao": "Exercício"},
]}
HIST_2 = {"dados": [
    {"dataHora": "2023-02-01T00:00", "idLegislatura": 57, "siglaPartido": "BBB", "situacao": "Suplência"},
    {"dataHora": "2024-03-01T00:00", "idLegislatura": 57, "siglaPartido": "BBB", "situacao": "Exercício"},
    {"dataHora": "2024-09-15T00:00", "idLegislatura": 57, "siglaPartido": "BBB", "situacao": "Suplência"},
]}


def _mock():
    respx.get(f"{API}/deputados").respond(200, json=LISTA)
    respx.get(f"{API}/deputados/1").respond(200, json=detalhe(1, "Ana Titular", "Ana Maria Titular", "CCC", "SP", "Exercício", "F"))
    respx.get(f"{API}/deputados/2").respond(200, json=detalhe(2, "Beto Suplente", "Roberto Suplente", "BBB", "RJ", "Suplência", "M"))
    respx.get(f"{API}/deputados/1/historico").respond(200, json=HIST_1)
    respx.get(f"{API}/deputados/2/historico").respond(200, json=HIST_2)


@respx.mock
def test_tabela_deputados_colunas(con, client):
    _mock()
    extract_deputados(client, con)
    cols = [r[0] for r in con.execute("DESCRIBE deputados").fetchall()]
    for c in ["id", "nome", "nome_civil", "sexo", "uf", "partido_atual", "foto", "email", "gabinete", "redes",
              "escolaridade", "nascimento", "situacao", "condicao_eleitoral", "inicio_exercicio", "fim_exercicio"]:
        assert c in cols
    assert con.execute("SELECT nome_civil, partido_atual FROM deputados WHERE id=1").fetchone() == ("Ana Maria Titular", "CCC")


@respx.mock
def test_suplente_periodo_exercicio(con, client):
    _mock()
    extract_deputados(client, con)
    rows = con.execute("SELECT inicio::VARCHAR, fim::VARCHAR FROM exercicios WHERE deputado_id=2").fetchall()
    assert rows == [("2024-03-01", "2024-09-15")]
    titular = con.execute("SELECT inicio::VARCHAR, fim FROM exercicios WHERE deputado_id=1").fetchall()
    assert titular == [("2023-02-01", None)]


@respx.mock
def test_troca_partido_gera_dois_periodos(con, client):
    _mock()
    extract_deputados(client, con)
    rows = con.execute(
        "SELECT partido, inicio::VARCHAR, fim::VARCHAR FROM deputado_partidos WHERE deputado_id=1 ORDER BY inicio"
    ).fetchall()
    assert rows == [("AAA", "2023-02-01", "2024-04-05"), ("CCC", "2024-04-05", None)]
