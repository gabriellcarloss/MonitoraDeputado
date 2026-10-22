import json

from monitora.fixtures import gerar_ficticios


def test_ficticios_exporta_contrato_completo(tmp_path):
    gerar_ficticios(tmp_path, n_deputados=30, seed=1)
    meta = json.loads((tmp_path / "meta.json").read_text())
    assert meta["ficticio"] is True
    deps = json.loads((tmp_path / "deputados.json").read_text())
    assert len(deps) >= 30
    regras = {r for d in deps for r in d["regras_alerta"]}
    assert {"G04", "L01", "V02"} <= regras
    assert (tmp_path / "parquet" / "despesas.parquet").exists()


def test_ficticios_deterministico(tmp_path):
    a, b = tmp_path / "a", tmp_path / "b"
    gerar_ficticios(a, n_deputados=10, seed=7)
    gerar_ficticios(b, n_deputados=10, seed=7)
    assert (a / "deputados.json").read_text() == (b / "deputados.json").read_text()
