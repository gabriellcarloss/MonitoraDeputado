from monitora import temas
from monitora.temas import OUTROS, PROCESSO, classificar, classificar_votacao, tema_dos_oficiais, tema_oficial


def test_tema_oficial_agrupa_rotulos_da_camara():
    assert tema_oficial("Saúde") == "Saúde"
    assert tema_oficial("Direito Penal e Processual Penal") == "Segurança pública e penal"
    assert tema_oficial("Economia") == "Economia, tributos e orçamento"
    assert tema_oficial("Meio Ambiente e Desenvolvimento Sustentável") == "Meio ambiente e energia"
    assert tema_oficial("Processo Legislativo e Atuação Parlamentar") == PROCESSO
    assert tema_oficial("Rótulo desconhecido") is None
    assert tema_oficial(None) is None


def test_palavras_chave_quando_nao_ha_tema_oficial():
    assert classificar("Dispõe sobre o piso salarial dos professores da educação básica") == "Educação"
    assert classificar("Altera o Código Penal para aumentar a pena do crime de roubo") == "Segurança pública e penal"
    assert classificar("Institui o Dia Nacional do Forró") == "Homenagens e datas"
    assert classificar("Texto sem pista nenhuma") == OUTROS
    assert classificar(None) == OUTROS


def test_varios_temas_oficiais_especifico_vence_generico():
    assert tema_dos_oficiais("Administração Pública; Saúde") == "Saúde"
    assert tema_dos_oficiais("Direito e Justiça; Processo Legislativo e Atuação Parlamentar") == "Justiça e direito"
    assert tema_dos_oficiais("Educação; Saúde", "Dispõe sobre vacina e hospital nas escolas") == "Saúde"
    assert tema_dos_oficiais("Rótulo desconhecido") is None


def test_municipios_sozinho_nao_vira_administracao_publica():
    assert classificar("Altera a lei para os Estados, o Distrito Federal e os Municípios") == OUTROS


def test_tema_oficial_tem_prioridade():
    assert classificar("Altera o Código Penal", "Saúde") == "Saúde"


def test_votacao_herda_tema_da_proposicao_ou_usa_descricao():
    assert classificar_votacao("Requerimento de urgência", "Saúde", None) == "Saúde"
    assert classificar_votacao("Aprovado o PL sobre tributos e imposto de renda", None, None) == "Economia, tributos e orçamento"
    assert classificar_votacao("Requerimento de Urgência", None, None) == PROCESSO
    assert classificar_votacao("Votação qualquer", None, None) == OUTROS


def test_todos_os_temas_listados():
    assert OUTROS in temas.TEMAS and PROCESSO in temas.TEMAS and len(set(temas.TEMAS)) == len(temas.TEMAS)


def test_aplicar_temas_preenche_proposicoes_e_votacoes(base):
    con = base
    con.execute("""INSERT INTO proposicoes (id, sigla_tipo, ementa, tema_oficial, relevante) VALUES
        (1, 'PL', 'Dispõe sobre o piso dos professores', NULL, true),
        (2, 'PL', 'Altera o Código Penal', 'Saúde', true),
        (3, 'REQ', 'Texto qualquer', NULL, false)""")
    con.execute("""INSERT INTO votacoes (id, descricao, proposicao_id) VALUES
        ('v1', 'Requerimento de urgência', 2), ('v2', 'Requerimento de Urgência', NULL), ('v3', 'Votação', 3)""")
    temas.aplicar_temas(con)
    assert dict(con.execute("SELECT id, tema FROM proposicoes").fetchall()) == {1: "Educação", 2: "Saúde", 3: OUTROS}
    assert con.execute("SELECT tema_oficial FROM proposicoes WHERE id = 2").fetchone()[0] == "Saúde"
    assert dict(con.execute("SELECT id, tema FROM votacoes").fetchall()) == {"v1": "Saúde", "v2": PROCESSO, "v3": OUTROS}
