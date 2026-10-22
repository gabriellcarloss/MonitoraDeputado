import json
import os
import time

import respx

from monitora.config import BRASIL_API, MINHA_RECEITA
from monitora.extract.cnpj import enrich_cnpj

C1, C2, CPF = "11111111000111", "22222222000122", "12345678901"


def receita(cnpj, nome):
    return {"cnpj": cnpj, "razao_social": nome, "nome_fantasia": "", "data_inicio_atividade": "2023-11-01",
            "descricao_situacao_cadastral": "ATIVA", "cnae_fiscal_descricao": "Transporte aéreo", "municipio": "SAO PAULO",
            "uf": "SP", "capital_social": 1000.0,
            "qsa": [{"nome_socio": "FULANO TITULAR", "qualificacao_socio": "Sócio-Administrador", "data_entrada_sociedade": "2023-11-01"}]}


def preparar(con):
    con.execute("CREATE TABLE despesas (cnpj_cpf VARCHAR, valor_liquido DOUBLE)")
    con.execute(f"INSERT INTO despesas VALUES ('{C1}', 100), ('{C2}', 5000), ('{CPF}', 9999)")


def test_usa_cache_menor_90_dias(con, client, tmp_path):
    preparar(con)
    (tmp_path / "cnpj").mkdir()
    (tmp_path / "cnpj" / f"{C1}.json").write_text(json.dumps({"consultado_em": time.time(), "dados": receita(C1, "CACHE LTDA")}))
    with respx.mock(assert_all_called=False) as m:
        r = m.get(MINHA_RECEITA.format(cnpj=C1)).respond(200, json=receita(C1, "NOVO"))
        m.get(MINHA_RECEITA.format(cnpj=C2)).respond(200, json=receita(C2, "DOIS"))
        enrich_cnpj(client, con, cache_dir=tmp_path)
    assert not r.called
    assert con.execute(f"SELECT razao_social FROM fornecedores WHERE cnpj='{C1}'").fetchone()[0] == "CACHE LTDA"


def test_fallback_brasilapi(con, client, tmp_path):
    preparar(con)
    with respx.mock:
        respx.get(MINHA_RECEITA.format(cnpj=C1)).respond(500)
        respx.get(BRASIL_API.format(cnpj=C1)).respond(200, json=receita(C1, "VIA BRASILAPI"))
        respx.get(MINHA_RECEITA.format(cnpj=C2)).respond(200, json=receita(C2, "DOIS"))
        enrich_cnpj(client, con, cache_dir=tmp_path)
    row = con.execute(f"SELECT razao_social, abertura::VARCHAR, socios[1].nome FROM fornecedores WHERE cnpj='{C1}'").fetchone()
    assert row == ("VIA BRASILAPI", "2023-11-01", "FULANO TITULAR")


def test_404_marca_sem_dados(con, client, tmp_path):
    preparar(con)
    with respx.mock:
        respx.get(MINHA_RECEITA.format(cnpj=C1)).respond(404)
        respx.get(BRASIL_API.format(cnpj=C1)).respond(404)
        respx.get(MINHA_RECEITA.format(cnpj=C2)).respond(200, json=receita(C2, "DOIS"))
        enrich_cnpj(client, con, cache_dir=tmp_path)
    assert con.execute(f"SELECT sem_dados FROM fornecedores WHERE cnpj='{C1}'").fetchone()[0] is True


def test_prioriza_maior_valor_e_respeita_limite(con, client, tmp_path):
    preparar(con)
    with respx.mock(assert_all_called=False) as m:
        r1 = m.get(MINHA_RECEITA.format(cnpj=C1)).respond(200, json=receita(C1, "UM"))
        r2 = m.get(MINHA_RECEITA.format(cnpj=C2)).respond(200, json=receita(C2, "DOIS"))
        enrich_cnpj(client, con, max_novos=1, cache_dir=tmp_path)
    assert r2.called and not r1.called


def test_cache_expirado_reconsulta(con, client, tmp_path):
    preparar(con)
    (tmp_path / "cnpj").mkdir()
    (tmp_path / "cnpj" / f"{C2}.json").write_text(json.dumps({"consultado_em": time.time() - 91 * 86400, "dados": receita(C2, "VELHO")}))
    with respx.mock(assert_all_called=False) as m:
        m.get(MINHA_RECEITA.format(cnpj=C1)).respond(200, json=receita(C1, "UM"))
        m.get(MINHA_RECEITA.format(cnpj=C2)).respond(200, json=receita(C2, "ATUAL"))
        enrich_cnpj(client, con, cache_dir=tmp_path)
    assert con.execute(f"SELECT razao_social FROM fornecedores WHERE cnpj='{C2}'").fetchone()[0] == "ATUAL"


def test_cpf_nao_consulta(con, client, tmp_path):
    preparar(con)
    with respx.mock(assert_all_called=False) as m:
        m.get(MINHA_RECEITA.format(cnpj=C1)).respond(200, json=receita(C1, "UM"))
        m.get(MINHA_RECEITA.format(cnpj=C2)).respond(200, json=receita(C2, "DOIS"))
        enrich_cnpj(client, con, cache_dir=tmp_path)
    assert con.execute(f"SELECT count(*) FROM fornecedores WHERE cnpj='{CPF}'").fetchone()[0] == 0


def test_erro_de_rede_nao_grava_cache(con, client, tmp_path):
    preparar(con)
    with respx.mock:
        respx.get(MINHA_RECEITA.format(cnpj=C1)).respond(503)
        respx.get(BRASIL_API.format(cnpj=C1)).respond(503)
        respx.get(MINHA_RECEITA.format(cnpj=C2)).respond(200, json=receita(C2, "DOIS"))
        enrich_cnpj(client, con, cache_dir=tmp_path)
    assert not (tmp_path / "cnpj" / f"{C1}.json").exists()
    assert con.execute(f"SELECT sem_dados FROM fornecedores WHERE cnpj='{C1}'").fetchone()[0] is True
