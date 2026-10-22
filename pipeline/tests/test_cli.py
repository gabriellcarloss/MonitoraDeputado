import json

from conftest import deputado
from monitora.cli import publicar


def test_cli_falha_nao_sobrescreve_saida_anterior(base, tmp_path):
    out = tmp_path / "data"
    out.mkdir()
    (out / "meta.json").write_text(json.dumps({"versao": "anterior", "contagens": {}}))
    deputado(base, 1)
    assert publicar(base, out, alertas=[], stale=set()) is False
    assert json.loads((out / "meta.json").read_text())["versao"] == "anterior"
