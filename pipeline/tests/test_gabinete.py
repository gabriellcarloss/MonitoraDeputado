import json

import respx

from conftest import deputado
from monitora.config import FUNCIONARIOS_URL
from monitora.extract.gabinete import extract_gabinete, parse_secretarios

DADOS = {"dados": [
    {"grupo": "Secretário Parlamentar", "nome": "JOÃO DA SILVA", "cargo": "SP25C",
     "uriLotacao": "https://dadosabertos.camara.leg.br/api/v2/deputados/1", "dataNomeacao": "2026-02-01",
     "dataInicioHistorico": "2023-02-01"},
    {"grupo": "Secretário Parlamentar", "nome": "MARIA", "cargo": "SP09S",
     "uriLotacao": "https://dadosabertos.camara.leg.br/api/v2/deputados/1", "dataNomeacao": "2024-02-01T00:00:00"},
    {"grupo": "Secretário Parlamentar", "nome": "LOTADO EM OUTRO", "cargo": "SP03",
     "uriLotacao": "https://dadosabertos.camara.leg.br/api/v2/deputados/777"},
    {"grupo": "Servidor Efetivo", "nome": "ANALISTA", "cargo": "AL",
     "uriLotacao": "https://dadosabertos.camara.leg.br/api/v2/deputados/1"},
    {"grupo": "Secretário Parlamentar", "nome": "SEM LOTACAO", "cargo": "SP01", "uriLotacao": "https://x/orgaos/5"},
]}


def test_parse_so_secretarios_com_deputado():
    linhas = parse_secretarios(DADOS)
    assert [(r[0], r[1], r[3]) for r in linhas] == [(1, "JOÃO DA SILVA", 25), (1, "MARIA", 9), (777, "LOTADO EM OUTRO", 3)]
    assert linhas[0][4] == 18719.88
    assert linhas[1][5] == "2024-02-01"


def test_parse_aceita_lista_pura():
    assert len(parse_secretarios(DADOS["dados"])) == 3


def test_extract_filtra_deputados_do_painel(base, client, tmp_path):
    deputado(base, 1)
    with respx.mock(assert_all_called=False) as m:
        m.get(FUNCIONARIOS_URL).respond(200, content=json.dumps(DADOS).encode())
        extract_gabinete(client, base, cache_dir=tmp_path)
    assert base.execute("SELECT deputado_id, nome, nivel FROM secretarios ORDER BY nivel DESC").fetchall() == [
        (1, "JOÃO DA SILVA", 25), (1, "MARIA", 9)]
