from datetime import date

from conftest import deputado
from monitora.validate import validar


def _ok(base, n=513):
    for i in range(n):
        deputado(base, i)
    base.execute(f"INSERT INTO despesas (deputado_id, ano_mes, data, valor_liquido) VALUES (1, '{date.today():%Y-%m}', current_date, 10)")


def test_validacao_ok(base):
    _ok(base)
    assert validar(base, None) == []


def test_validacao_falha_poucos_deputados(base):
    _ok(base, n=100)
    assert any("deputados" in e for e in validar(base, None))


def test_validacao_falha_queda_despesas_maior_5pct(base):
    _ok(base)
    erros = validar(base, {"contagens": {"despesas": 100}})
    assert any("despesas" in e for e in erros)
    assert validar(base, {"contagens": {"despesas": 1}}) == []


def test_validacao_falha_voto_orfao(base):
    _ok(base)
    base.execute("INSERT INTO votos VALUES ('x', 1, 'Sim', 'AAA', NULL)")
    assert any("votos" in e for e in validar(base, None))
