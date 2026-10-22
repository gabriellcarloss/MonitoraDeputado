from conftest import deputado
from monitora.metrics.series import detectar_picos, gerar_series, series_de


def meses(valores, inicio=2023):
    return [(f"{inicio + i // 12}-{i % 12 + 1:02d}", float(v)) for i, v in enumerate(valores)]


def test_pico_mad():
    picos = detectar_picos(meses([10, 10, 11, 9, 10, 12, 10, 100]))
    assert [p["periodo"] for p in picos] == ["2023-08"]


def test_pico_media_12m():
    picos = detectar_picos(meses([100] * 12 + [10] * 12 + [40]))
    assert [p["periodo"] for p in picos] == ["2025-01"]
    assert picos[0]["fator"] == 4.0


def test_serie_constante_sem_pico():
    assert detectar_picos(meses([50] * 24)) == []
    assert detectar_picos([]) == []


def test_rotulo_virgula():
    picos = detectar_picos(meses([10] * 12 + [32]))
    assert picos[0]["rotulo"] == "pico: 3,2× a média"


def test_preenche_meses_vazios(base):
    deputado(base, 1)
    base.execute("INSERT INTO despesas (deputado_id, ano_mes, cnpj_cpf, valor_liquido) VALUES "
                 "(1, '2024-01', 'X', 100), (1, '2024-03', 'X', 50)")
    gerar_series(base)
    s = series_de(base, "deputado", "1")
    gasto = next(x for x in s if x["metrica"] == "gasto")
    assert [(p["periodo"], p["valor"]) for p in gasto["pontos"]] == [("2024-01", 100), ("2024-02", 0), ("2024-03", 50)]
    assert any(x["metrica"] == "gasto" for x in series_de(base, "fornecedor", "X"))


def test_presenca_mensal_nao_preenche_zero(base):
    deputado(base, 1)
    base.execute("INSERT INTO sessoes VALUES (1, '2024-01-10', 'S'), (2, '2024-03-10', 'S'), (3, '2024-03-11', 'S')")
    base.execute("INSERT INTO presencas VALUES (1, 1, true), (2, 1, true), (3, 1, false)")
    gerar_series(base)
    pres = next(x for x in series_de(base, "brasil", "BR") if x["metrica"] == "presenca")
    assert [(p["periodo"], p["valor"]) for p in pres["pontos"]] == [("2024-01", 1.0), ("2024-03", 0.5)]
