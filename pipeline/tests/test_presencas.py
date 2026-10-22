import json
from datetime import date

import respx

from monitora.config import API
from monitora.extract.presencas import extract_presencas

REF = {"dados": [{"cod": "110", "nome": "Sessão Deliberativa"}, {"cod": "111", "nome": "Sessão Não Deliberativa Solene"},
                 {"cod": "120", "nome": "Reunião Deliberativa"}]}
EVENTOS = {"dados": [
    {"id": 1, "dataHoraInicio": "2024-03-05T14:00", "situacao": "Encerrada", "descricaoTipo": "Sessão Deliberativa"},
    {"id": 2, "dataHoraInicio": "2024-03-06T14:00", "situacao": "Cancelada", "descricaoTipo": "Sessão Deliberativa"},
    {"id": 3, "dataHoraInicio": "2024-03-20T14:00", "situacao": "Encerrada", "descricaoTipo": "Sessão Deliberativa"},
], "links": []}


def preparar(con):
    con.execute("CREATE TABLE exercicios (deputado_id BIGINT, inicio DATE, fim DATE)")
    con.execute("INSERT INTO exercicios VALUES (1, '2023-02-01', NULL), (2, '2023-02-01', NULL), (3, '2024-03-10', NULL)")


def rodar(con, client, tmp_path):
    with respx.mock(assert_all_called=False) as m:
        m.get(f"{API}/referencias/eventos/codTipoEvento").respond(200, json=REF)
        m.get(f"{API}/eventos").respond(200, json=EVENTOS)
        r1 = m.get(f"{API}/eventos/1/deputados").respond(200, json={"dados": [{"id": 1}]})
        m.get(f"{API}/eventos/3/deputados").respond(200, json={"dados": [{"id": 1}, {"id": 3}]})
        extract_presencas(client, con, date(2024, 3, 1), date(2024, 3, 31), cache_dir=tmp_path)
        return r1


def presencas(con):
    return {(s, d): p for s, d, p in con.execute("SELECT sessao_id, deputado_id, presente FROM presencas").fetchall()}


def test_ausente_quando_em_exercicio_e_nao_listado(con, client, tmp_path):
    preparar(con)
    rodar(con, client, tmp_path)
    p = presencas(con)
    assert p[(1, 1)] is True
    assert p[(1, 2)] is False


def test_fora_do_exercicio_nao_conta(con, client, tmp_path):
    preparar(con)
    rodar(con, client, tmp_path)
    p = presencas(con)
    assert (1, 3) not in p
    assert p[(3, 3)] is True


def test_sessao_cancelada_ignorada(con, client, tmp_path):
    preparar(con)
    rodar(con, client, tmp_path)
    assert [r[0] for r in con.execute("SELECT id FROM sessoes ORDER BY id").fetchall()] == [1, 3]


def test_incremental_nao_rebaixa(con, client, tmp_path):
    preparar(con)
    (tmp_path / "sessoes").mkdir()
    (tmp_path / "sessoes" / "1.json").write_text(json.dumps({"data": "2024-03-05", "tipo": "Sessão Deliberativa", "presentes": [1, 2]}))
    r1 = rodar(con, client, tmp_path)
    assert not r1.called
    assert presencas(con)[(1, 2)] is True
