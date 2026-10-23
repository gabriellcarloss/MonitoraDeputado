from datetime import date

import httpx
import respx

from conftest import deputado
from monitora.config import LEGADO
from monitora.extract.frequencia import extract_frequencia, parse_dia, parse_matriculas

XML_DIA = """<?xml version="1.0" encoding="utf-8"?>
<dia>
  <data>05/03/2024 14:00:00</data>
  <parlamentares>
    <parlamentar><carteiraParlamentar>10</carteiraParlamentar><nomeParlamentar>Ana Exemplo-AAA/SP</nomeParlamentar>
      <descricaoFrequenciaDia>Presença</descricaoFrequenciaDia><justificativa>
      </justificativa></parlamentar>
    <parlamentar><carteiraParlamentar>20</carteiraParlamentar><nomeParlamentar>Bia Teste-AAA/SP</nomeParlamentar>
      <descricaoFrequenciaDia>Ausência justificada</descricaoFrequenciaDia><justificativa>Missão Autorizada</justificativa></parlamentar>
    <parlamentar><carteiraParlamentar>99</carteiraParlamentar><nomeParlamentar>Caio Nome Unico-BBB/RJ</nomeParlamentar>
      <descricaoFrequenciaDia>Ausência</descricaoFrequenciaDia><justificativa /></parlamentar>
  </parlamentares>
</dia>""".encode()

XML_DEPS = b"""<?xml version="1.0" encoding="utf-8"?><deputados>
<deputado><ideCadastro>1</ideCadastro><matricula>10</matricula></deputado>
<deputado><ideCadastro>2</ideCadastro><matricula>20</matricula></deputado></deputados>"""


def test_parse_dia():
    dia, regs = parse_dia(XML_DIA)
    assert dia == date(2024, 3, 5)
    assert [(r["matricula"], r["frequencia"], r["justificativa"]) for r in regs] == [
        (10, "Presença", None), (20, "Ausência justificada", "Missão Autorizada"), (99, "Ausência", None)]


def test_dia_sem_sessao():
    assert parse_dia(b"<dia />") == (None, [])


def test_parse_matriculas():
    assert parse_matriculas(XML_DEPS) == {10: 1, 20: 2}


def _preparar(base):
    deputado(base, 1, nome="Ana Exemplo")
    deputado(base, 2, nome="Bia Teste")
    deputado(base, 3, nome="Caio Nome Unico")  # sem matrícula: casa pelo nome
    base.execute("INSERT INTO sessoes VALUES (1, '2024-03-05', 'S')")


def test_extract_casa_por_matricula_e_por_nome(base, client, tmp_path):
    _preparar(base)
    with respx.mock(assert_all_called=False) as m:
        m.get(f"{LEGADO}/Deputados.asmx/ObterDeputados").respond(200, content=XML_DEPS)
        m.get(f"{LEGADO}/SessoesReunioes.asmx/ListarPresencasDia").respond(200, content=XML_DIA)
        extract_frequencia(client, base, cache_dir=tmp_path, hoje=date(2026, 1, 1))
    rows = base.execute("SELECT deputado_id, frequencia, justificativa FROM frequencia_dia ORDER BY 1").fetchall()
    assert rows == [(1, "Presença", None), (2, "Ausência justificada", "Missão Autorizada"), (3, "Ausência", None)]
    assert "SitCamaraWS" not in client.stale_sources


def test_extract_usa_cache_quando_servico_cai(base, client, tmp_path):
    _preparar(base)
    with respx.mock(assert_all_called=False) as m:
        m.get(f"{LEGADO}/Deputados.asmx/ObterDeputados").respond(200, content=XML_DEPS)
        m.get(f"{LEGADO}/SessoesReunioes.asmx/ListarPresencasDia").respond(200, content=XML_DIA)
        extract_frequencia(client, base, cache_dir=tmp_path, hoje=date(2026, 1, 1))
    # dia antigo já em cache: não consulta de novo; e se o serviço cair, segue com o cache
    with respx.mock(assert_all_called=False) as m:
        rota = m.get(f"{LEGADO}/SessoesReunioes.asmx/ListarPresencasDia").mock(side_effect=httpx.ConnectError("fora"))
        extract_frequencia(client, base, cache_dir=tmp_path, hoje=date(2026, 1, 1))
        assert not rota.called
    assert base.execute("SELECT count(*) FROM frequencia_dia").fetchone()[0] == 3


def test_servico_fora_do_ar_nao_quebra(base, client, tmp_path):
    _preparar(base)
    with respx.mock(assert_all_called=False) as m:
        m.get(f"{LEGADO}/Deputados.asmx/ObterDeputados").mock(side_effect=httpx.ConnectError("fora"))
        extract_frequencia(client, base, cache_dir=tmp_path, hoje=date(2026, 1, 1))
    assert base.execute("SELECT count(*) FROM frequencia_dia").fetchone()[0] == 0
    assert "SitCamaraWS" in client.stale_sources
