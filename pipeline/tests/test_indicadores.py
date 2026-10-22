from datetime import date

import pytest

from conftest import deputado
from monitora.extract.votacoes import resolver_orientacoes
from monitora.metrics.indicadores import agregados, calcular_indicadores

INI, FIM = date(2024, 1, 1), date(2024, 12, 31)


def ind(con, id_):
    cols = [d[0] for d in con.execute("SELECT * FROM indicadores LIMIT 0").description]
    row = con.execute("SELECT * FROM indicadores WHERE deputado_id = ?", [id_]).fetchone()
    return dict(zip(cols, row))


def test_suplente_sem_registros_indicadores_zero_e_custos_none(base):
    deputado(base, 9, inicio="2024-12-01")
    calcular_indicadores(base, INI, FIM)
    i = ind(base, 9)
    assert i["gasto_total"] == 0
    assert i["n_proposicoes_relevantes"] == 0
    assert i["custo_por_proposicao"] is None
    assert i["custo_por_sessao"] is None
    assert i["pct_presenca_sessoes"] is None
    assert i["meses_exercicio"] == pytest.approx(1.0, abs=0.05)


def test_gasto_e_custo_por_proposicao(base):
    deputado(base, 1)
    base.execute("INSERT INTO despesas (deputado_id, ano_mes, cnpj_cpf, fornecedor, valor_liquido) VALUES "
                 "(1, '2024-01', 'X', 'X', 600), (1, '2024-02', 'Y', 'Y', 400), (1, '2023-12', 'Y', 'Y', 999)")
    base.execute("INSERT INTO proposicoes (id, sigla_tipo, data_apresentacao, relevante, situacao) VALUES "
                 "(10, 'PL', '2024-03-01', true, 'Transformado em Norma Jurídica'), (11, 'REQ', '2024-03-01', false, NULL)")
    base.execute("INSERT INTO autorias VALUES (10, 1, true, 1), (11, 1, true, 1)")
    calcular_indicadores(base, INI, FIM)
    i = ind(base, 1)
    assert i["gasto_total"] == 1000
    assert i["pct_maior_fornecedor"] == pytest.approx(0.6)
    assert i["n_proposicoes_relevantes"] == 1
    assert i["n_requerimentos"] == 1
    assert i["n_aprovadas"] == 1
    assert i["custo_por_proposicao"] == 1000


def test_participacao_ignora_votacoes_fora_exercicio(base):
    deputado(base, 1, inicio="2024-06-01")
    base.execute("INSERT INTO votacoes (id, data, sigla_orgao) VALUES ('a', '2024-03-01', 'PLEN'), ('b', '2024-07-01', 'PLEN'),"
                 " ('c', '2024-07-02', 'PLEN'), ('d', '2024-07-03', 'CCJC')")
    base.execute("INSERT INTO votos VALUES ('b', 1, 'Sim', 'AAA', '2024-07-01')")
    calcular_indicadores(base, INI, FIM)
    assert ind(base, 1)["pct_participacao_votacoes"] == pytest.approx(0.5)


def test_alinhamento_ignora_liberado(base):
    deputado(base, 1)
    base.execute("INSERT INTO votacoes (id, data, sigla_orgao) VALUES ('a', '2024-03-01', 'PLEN'), ('b', '2024-03-02', 'PLEN'),"
                 " ('c', '2024-03-03', 'PLEN')")
    base.execute("INSERT INTO votos VALUES ('a', 1, 'Sim', 'AAA', NULL), ('b', 1, 'Sim', 'AAA', NULL), ('c', 1, 'Não', 'AAA', NULL)")
    base.execute("INSERT INTO orientacoes VALUES ('a', 'AAA', 'Sim'), ('b', 'AAA', 'Liberado'), ('c', 'AAA', 'Sim'),"
                 " ('a', 'Governo', 'Não')")
    resolver_orientacoes(base)
    calcular_indicadores(base, INI, FIM)
    i = ind(base, 1)
    assert i["pct_alinhamento_partido"] == pytest.approx(0.5)
    assert i["n_votos_contra_bancada"] == 1
    assert i["pct_alinhamento_governo"] == pytest.approx(0.0)


def test_posicao_inversa_para_gasto(base):
    deputado(base, 1)
    deputado(base, 2)
    base.execute("INSERT INTO despesas (deputado_id, ano_mes, valor_liquido) VALUES (1, '2024-01', 100), (2, '2024-01', 900)")
    base.execute("INSERT INTO proposicoes (id, sigla_tipo, data_apresentacao, relevante) VALUES (10, 'PL', '2024-03-01', true)")
    base.execute("INSERT INTO autorias VALUES (10, 2, true, 1)")
    calcular_indicadores(base, INI, FIM)
    pos = {(d, i): b for d, i, b in base.execute("SELECT deputado_id, indicador, brasil FROM posicoes").fetchall()}
    assert pos[(1, "gasto_total")] == 1
    assert pos[(2, "gasto_total")] == 2
    assert pos[(2, "n_proposicoes_relevantes")] == 1


def test_agregados_por_uf(base):
    deputado(base, 1, uf="SP")
    deputado(base, 2, uf="SP")
    deputado(base, 3, uf="RJ")
    base.execute("INSERT INTO despesas (deputado_id, ano_mes, valor_liquido) VALUES (1, '2024-01', 100), (2, '2024-01', 300),"
                 " (3, '2024-01', 50)")
    calcular_indicadores(base, INI, FIM)
    ag = agregados(base)
    assert ag["uf"]["SP"]["gasto_total"]["media"] == 200
    assert ag["uf"]["SP"]["gasto_total"]["mediana"] == 200
    assert ag["brasil"]["gasto_total"]["soma"] == 450
    assert ag["partido"]["AAA"]["n"] == 3


def test_ranking_exclui_menos_de_1_mes_e_informa_total(base):
    deputado(base, 1)
    deputado(base, 2)
    deputado(base, 3, inicio="2024-12-20")  # ~0,4 mês
    base.execute("INSERT INTO despesas (deputado_id, ano_mes, valor_liquido) VALUES (1, '2024-01', 100), (2, '2024-01', 900)")
    calcular_indicadores(base, INI, FIM)
    rows = base.execute("SELECT deputado_id, brasil, total FROM posicoes WHERE indicador='gasto_total' ORDER BY 1").fetchall()
    assert rows == [(1, 1, 2), (2, 2, 2)]
