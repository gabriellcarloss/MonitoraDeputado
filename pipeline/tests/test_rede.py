from conftest import deputado
from monitora.metrics.rede import ego_rede, gerar_rede


def gasto(con, dep, cnpj, valor, passageiro=None, eh=None):
    con.execute("INSERT INTO despesas (deputado_id, cnpj_cpf, fornecedor, valor_liquido, passageiro, passageiro_e_deputado) "
                "VALUES (?, ?, ?, ?, ?, ?)", [dep, cnpj, f"F{cnpj}", valor, passageiro, eh])


def test_aresta_soma_valores(base):
    deputado(base, 1)
    gasto(base, 1, "A", 100)
    gasto(base, 1, "A", 50)
    gerar_rede(base)
    assert base.execute("SELECT valor, n FROM rede_arestas WHERE origem_id='1' AND destino_id='A'").fetchone() == (150, 2)


def test_passageiro_deputado_excluido(base):
    deputado(base, 1)
    gasto(base, 1, "GOL", 100, passageiro="Dep", eh=True)
    gasto(base, 1, "GOL", 100, passageiro="Fulano de Tal", eh=False)
    gerar_rede(base)
    pas = base.execute("SELECT destino_id FROM rede_arestas WHERE destino_tipo='passageiro'").fetchall()
    assert pas == [("FULANO DE TAL",)]


def test_socio_ligado_ao_fornecedor(base):
    deputado(base, 1)
    gasto(base, 1, "A", 100)
    base.execute("INSERT INTO fornecedores (cnpj, razao_social, socios, sem_dados) VALUES "
                 "('A', 'EMPRESA A', [{'nome': 'JOAO SOCIO', 'qualificacao': 'S', 'entrada': NULL}], false)")
    gerar_rede(base)
    assert base.execute("SELECT origem_id, destino_id FROM rede_arestas WHERE destino_tipo='socio'").fetchall() == [("A", "JOAO SOCIO")]


def test_ego_inclui_deputado_que_compartilha_fornecedor(base):
    deputado(base, 1, nome="Ana")
    deputado(base, 2, nome="Beto")
    deputado(base, 3, nome="Caio")
    gasto(base, 1, "A", 100)
    gasto(base, 2, "A", 70)
    gasto(base, 3, "B", 10)
    gerar_rede(base)
    rede = ego_rede(base, "deputado", "1")
    ids = {n["id"] for n in rede["nos"]}
    assert ids == {"deputado:1", "fornecedor:A", "deputado:2"}
    assert {"origem": "deputado:2", "destino": "fornecedor:A", "valor": 70.0, "n": 1} in rede["arestas"]
    assert next(n for n in rede["nos"] if n["id"] == "deputado:2")["rotulo"] == "Beto"


def test_limite_nos(base):
    deputado(base, 1)
    for i in range(20):
        gasto(base, 1, f"F{i:02d}", 100 + i)
    gerar_rede(base)
    rede = ego_rede(base, "deputado", "1", limite=5)
    assert len(rede["nos"]) == 5
    assert "fornecedor:F19" in {n["id"] for n in rede["nos"]}
    ids = {n["id"] for n in rede["nos"]}
    assert all(a["origem"] in ids and a["destino"] in ids for a in rede["arestas"])
