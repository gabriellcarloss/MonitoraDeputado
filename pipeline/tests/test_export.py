import json
from datetime import date

from conftest import deputado
from monitora.export import exportar
from monitora.metrics.alertas import gerar_alertas
from monitora.metrics.indicadores import calcular_indicadores
from monitora.metrics.rede import gerar_rede
from monitora.metrics.series import gerar_series

ARQUIVOS = {"meta.json", "deputados.json", "brasil.json", "alertas.json"}
PARQUETS = {"despesas", "fornecedores", "votacoes", "votos", "orientacoes", "orientacao_partido", "sessoes", "presencas", "proposicoes",
            "autorias", "relatorias", "rede_arestas", "deputados", "series"}


def preparar(base):
    deputado(base, 1, nome="Ana")
    deputado(base, 2, nome="Suplente", inicio="2024-12-01")
    base.execute("INSERT INTO despesas (deputado_id, ano_mes, cnpj_cpf, fornecedor, valor_liquido, categoria) VALUES "
                 "(1, '2024-01', '1', 'F', 100, 'X')")
    calcular_indicadores(base, date(2023, 2, 1), date(2024, 12, 31))
    gerar_series(base)
    gerar_rede(base)
    return gerar_alertas(base)


def test_export_escreve_todos_arquivos(base, tmp_path):
    exportar(base, tmp_path, preparar(base), stale=set())
    assert ARQUIVOS <= {p.name for p in tmp_path.iterdir()}
    assert {p.stem for p in (tmp_path / "parquet").iterdir()} == PARQUETS
    assert {p.name for p in (tmp_path / "deputado").iterdir()} == {"1.json", "2.json"}
    d = json.loads((tmp_path / "deputado" / "1.json").read_text())
    assert set(d) == {"deputado", "indicadores", "posicoes", "series", "alertas", "top_fornecedores", "proposicoes", "rede",
                      "gabinete", "emendas"}
    assert d["gabinete"]["n"] == 0 and d["emendas"]["n"] == 0


def test_export_json_sem_nan(base, tmp_path):
    exportar(base, tmp_path, preparar(base), stale=set())
    texto = (tmp_path / "deputado" / "2.json").read_text()
    assert "NaN" not in texto and "Infinity" not in texto
    assert json.loads(texto)["indicadores"]["custo_por_proposicao"] is None
    resumo = {d["id"]: d for d in json.loads((tmp_path / "deputados.json").read_text())}
    assert resumo[1]["indicadores"]["gasto_total"] == 100
    assert "n_alertas" in resumo[1] and "posicoes" in resumo[1]


def test_meta_marca_fonte_desatualizada(base, tmp_path):
    exportar(base, tmp_path, preparar(base), stale={"www.camara.leg.br"})
    meta = json.loads((tmp_path / "meta.json").read_text())
    assert meta["fontes"]["Câmara — Cota parlamentar (CEAP)"]["desatualizada"] is True
    assert meta["fontes"]["Câmara — Dados Abertos"]["desatualizada"] is False
    assert meta["contagens"]["despesas"] == 1


def test_meta_lista_21_regras(base, tmp_path):
    exportar(base, tmp_path, preparar(base), stale=set())
    meta = json.loads((tmp_path / "meta.json").read_text())
    assert len(meta["regras"]) == 21
    assert set(meta["regras"][0]) == {"id", "titulo", "severidade", "descricao"}
    assert meta["rodape_alerta"] == "Ponto de atenção gerado automaticamente a partir de dados públicos. Não constitui acusação."


def test_proposicoes_por_deputado_limitadas_relevantes_primeiro(base, tmp_path):
    deputado(base, 1, nome="Ana")
    for k in range(260):
        tipo = "PL" if k < 5 else "REQ"
        base.execute("INSERT INTO proposicoes (id, sigla_tipo, data_apresentacao, relevante) VALUES (?, ?, '2024-01-01', ?)", [k, tipo, k < 5])
        base.execute("INSERT INTO autorias VALUES (?, 1, true, 1)", [k])
    calcular_indicadores(base, date(2023, 2, 1), date(2024, 12, 31))
    gerar_series(base)
    gerar_rede(base)
    exportar(base, tmp_path, [], stale=set())
    props = json.loads((tmp_path / "deputado" / "1.json").read_text())["proposicoes"]
    assert len(props) == 200
    assert sum(p["relevante"] for p in props) == 5


def test_parquet_de_despesas_ordenado_por_deputado(base, tmp_path):
    import duckdb
    for d in (3, 1, 2):
        deputado(base, d)
        base.execute("INSERT INTO despesas (deputado_id, ano_mes, valor_liquido) VALUES (?, '2024-01', 1)", [d])
    calcular_indicadores(base, date(2023, 2, 1), date(2024, 12, 31))
    gerar_series(base)
    gerar_rede(base)
    exportar(base, tmp_path, [], stale=set())
    ids = [r[0] for r in duckdb.sql(f"SELECT deputado_id FROM '{tmp_path}/parquet/despesas.parquet'").fetchall()]
    assert ids == [1, 2, 3]


def test_export_gabinete_emendas_e_justificativa(base, tmp_path):
    import duckdb
    deputado(base, 1, nome="Ana", uf="SP")
    base.execute("INSERT INTO secretarios VALUES (1, 'MARIA SOUZA', 'SP10', 10, 5699.90, '2026-01-10', '2023-02-01')")
    base.execute("INSERT INTO emendas (codigo, ano, tipo, deputado_id, uf, funcao, empenhado, pago, pix) VALUES "
                 "('a', 2025, 'Individual', 1, 'BA', 'Saúde', 1000, 500, true), ('b', 2024, 'Individual', 1, 'SP', 'Saúde', 3000, 3000, false)")
    base.execute("INSERT INTO emendas_favorecidos (codigo, deputado_id, favorecido, natureza, uf, municipio, valor) VALUES "
                 "('a', 1, 'MUNICIPIO DE X', 'Município', 'BA', 'X', 400), ('b', 1, 'MUNICIPIO DE Y', 'Município', 'SP', 'Y', 3000), "
                 "('a', 1, 'BANCO DO BRASIL SA', 'Sociedade de Economia Mista', 'DF', 'BRASILIA', 100)")
    base.execute("INSERT INTO sessoes VALUES (10, '2024-05-02', 'S')")
    base.execute("INSERT INTO presencas VALUES (10, 1, false)")
    base.execute("INSERT INTO frequencia_dia VALUES ('2024-05-02', 1, 'Ausência justificada', 'Missão Autorizada')")
    calcular_indicadores(base, date(2023, 2, 1), date(2024, 12, 31))
    gerar_series(base)
    gerar_rede(base)
    exportar(base, tmp_path, gerar_alertas(base), stale=set())
    d = json.loads((tmp_path / "deputado" / "1.json").read_text())
    assert d["gabinete"]["n"] == 1 and d["gabinete"]["custo_estimado"] == 5699.90
    e = d["emendas"]
    assert (e["empenhado"], e["pago"], e["pix"]) == (4000, 3500, 1000)
    assert (e["recebido"], e["fora_uf"]) == (3400, 400)  # banco intermediário fica fora
    assert [x["rotulo"] for x in e["por_local"]] == ["Y/SP", "X/BA"]
    assert [x["ano"] for x in e["por_ano"]] == [2024, 2025]
    resumo = json.loads((tmp_path / "deputados.json").read_text())[0]
    assert (resumo["n_secretarios"], resumo["emendas_empenhado"]) == (1, 4000)
    pres = duckdb.sql(f"SELECT presente, justificada, justificativa FROM '{tmp_path}/parquet/presencas.parquet'").fetchall()
    assert pres == [(False, True, "Missão Autorizada")]
    assert d["indicadores"]["pct_presenca_sessoes"] is None  # única sessão foi ausência justificada
