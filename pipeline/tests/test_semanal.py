import json
from datetime import date

from conftest import deputado
from monitora.export import exportar
from monitora.metrics.semanal import resumo_semanal

HOJE = date(2026, 11, 12)


def _base(base):
    deputado(base, 1, nome="Ana", partido="AAA")
    deputado(base, 2, nome="Beto", partido="BBB")
    base.execute("INSERT INTO sessoes VALUES (10, '2026-11-10', 'Deliberativa'), (11, '2026-10-01', 'Deliberativa')")
    base.execute("INSERT INTO presencas VALUES (10, 1, true), (10, 2, false), (11, 1, true)")
    base.execute("INSERT INTO votacoes (id, data, descricao, aprovacao, votos_sim, votos_nao, votos_outros, tema) VALUES "
                 "('v1', '2026-11-10', 'Aprova o PL da saúde', 1, 300, 100, 5, 'Saúde'),"
                 "('v0', '2026-09-01', 'Votação antiga', 0, 1, 1, 1, 'Outros')")
    base.execute("INSERT INTO votos VALUES ('v1', 1, 'Sim', 'AAA', '2026-11-10'), ('v0', 1, 'Não', 'AAA', '2026-09-01')")
    base.execute("INSERT INTO proposicoes (id, sigla_tipo, numero, ano, ementa, tema, data_apresentacao) VALUES "
                 "(1, 'PL', 5, 2026, 'Dispõe sobre X', 'Saúde', '2026-11-09')")
    base.execute("INSERT INTO autorias VALUES (1, 1, true, 1)")
    base.execute("INSERT INTO despesas (deputado_id, data, ano_mes, categoria, valor_liquido) VALUES "
                 "(1, '2026-11-08', '2026-11', 'Combustível', 120.5), (1, '2026-09-01', '2026-09', 'Outros', 999)")


def test_resumo_considera_so_os_ultimos_7_dias(base):
    _base(base)
    r = resumo_semanal(base, [], HOJE)
    g = r["geral"]
    assert (g["sessoes"], g["votacoes"], g["aprovadas"], g["proposicoes"]) == (1, 1, 1, 1)
    assert g["gasto_cota"] == 120.5 and g["maiores_gastos"][0]["nome"] == "Ana"
    a = r["1"]
    assert a["presenca"] == {"sessoes": 1, "presentes": 1, "faltas": 0}
    assert a["votos"]["total"] == 1 and a["votos"]["destaques"][0]["voto"] == "Sim"
    assert a["proposicoes"]["itens"][0]["nome"] == "PL 5/2026"
    assert a["gasto_semana"]["maior_categoria"] == "Combustível"
    b = r["2"]
    assert b["presenca"]["faltas"] == 1 and b["gasto_semana"] is None and b["votos"]["total"] == 0


def test_export_grava_um_arquivo_por_deputado(base, tmp_path):
    from test_export import preparar
    exportar(base, tmp_path, preparar(base), stale=set())
    assert (tmp_path / "semanal" / "geral.json").exists()
    assert json.loads((tmp_path / "semanal" / "1.json").read_text())["deputado"]["nome"] == "Ana"
