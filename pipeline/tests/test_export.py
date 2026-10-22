import json
from datetime import date

from conftest import deputado
from monitora.export import exportar
from monitora.metrics.alertas import gerar_alertas
from monitora.metrics.indicadores import calcular_indicadores
from monitora.metrics.rede import gerar_rede
from monitora.metrics.series import gerar_series

ARQUIVOS = {"meta.json", "deputados.json", "brasil.json", "alertas.json"}
PARQUETS = {"despesas", "fornecedores", "votacoes", "votos", "orientacoes", "sessoes", "presencas", "proposicoes",
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
    assert set(d) == {"deputado", "indicadores", "posicoes", "series", "alertas", "top_fornecedores", "proposicoes", "rede"}


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


def test_meta_lista_16_regras(base, tmp_path):
    exportar(base, tmp_path, preparar(base), stale=set())
    meta = json.loads((tmp_path / "meta.json").read_text())
    assert len(meta["regras"]) == 16
    assert set(meta["regras"][0]) == {"id", "titulo", "severidade", "descricao"}
    assert meta["rodape_alerta"] == "Ponto de atenção gerado automaticamente a partir de dados públicos. Não constitui acusação."
