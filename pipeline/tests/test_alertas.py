from datetime import date

import pytest

from conftest import deputado
from monitora.extract.votacoes import resolver_orientacoes
from monitora.metrics.alertas import REGRAS, gerar_alertas
from monitora.metrics.indicadores import calcular_indicadores
from monitora.metrics.series import gerar_series

INI, FIM = date(2023, 2, 1), date(2024, 12, 31)


def rodar(con, regra):
    resolver_orientacoes(con)
    calcular_indicadores(con, INI, FIM)
    gerar_series(con)
    return {a["deputado_id"] for a in REGRAS[regra].fn(con)}


def gasto(con, dep, valor, ano_mes="2024-01", cnpj="11111111000111", categoria="DIVULGAÇÃO", data="2024-01-10", **kw):
    cols = {"deputado_id": dep, "ano_mes": ano_mes, "cnpj_cpf": cnpj, "fornecedor": f"F{cnpj}", "categoria": categoria,
            "valor_liquido": valor, "valor_documento": valor, "valor_glosa": 0, "data": data, **kw}
    con.execute(f"INSERT INTO despesas ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})", list(cols.values()))


def tres_sp(con):
    for i in (1, 2, 3):
        deputado(con, i)


def test_regras_sao_16():
    assert sorted(REGRAS) == sorted(["G01", "G02", "G03", "G04", "G05", "G06", "G07", "G08", "G09", "G10", "G11", "G12",
                                     "E01", "E02", "E03", "P01", "P02", "L01", "L02", "V01", "V02"])


# G01 — gasto > 2× mediana da UF
def test_G01_dispara(base):
    tres_sp(base)
    for d, v in ((1, 100), (2, 100), (3, 250)):
        gasto(base, d, v)
    assert rodar(base, "G01") == {3}


def test_G01_nao_dispara(base):
    tres_sp(base)
    for d, v in ((1, 100), (2, 100), (3, 190)):
        gasto(base, d, v)
    assert rodar(base, "G01") == set()


# G02 — pico mensal de gasto
def test_G02_dispara(base):
    deputado(base, 1)
    for m in range(1, 13):
        gasto(base, 1, 100, ano_mes=f"2023-{m:02d}")
    gasto(base, 1, 1000, ano_mes="2024-01")
    assert rodar(base, "G02") == {1}


def test_G02_nao_dispara(base):
    deputado(base, 1)
    for m in range(1, 13):
        gasto(base, 1, 100, ano_mes=f"2023-{m:02d}")
    assert rodar(base, "G02") == set()


# G03 — ≥ 50% em um fornecedor (mínimo R$ 20 mil)
def test_G03_dispara(base):
    deputado(base, 1)
    gasto(base, 1, 30000, cnpj="1" * 14)
    gasto(base, 1, 10000, cnpj="2" * 14)
    assert rodar(base, "G03") == {1}


def test_G03_nao_dispara(base):
    deputado(base, 1)
    deputado(base, 2)
    gasto(base, 1, 15000, cnpj="1" * 14)
    gasto(base, 1, 1000, cnpj="2" * 14)
    for c in "123":
        gasto(base, 2, 25000, cnpj=c * 14)
    assert rodar(base, "G03") == set()


# G04 — passagens para terceiros
def test_G04_dispara(base):
    deputado(base, 1)
    gasto(base, 1, 900, categoria="PASSAGEM AÉREA - SIGEPA", passageiro="FULANO", passageiro_e_deputado=False)
    alertas = REGRAS["G04"].fn(base)
    assert [a["deputado_id"] for a in alertas] == [1]
    assert alertas[0]["severidade"] == "atencao"


def test_G04_nao_dispara(base):
    deputado(base, 1)
    gasto(base, 1, 900, categoria="PASSAGEM AÉREA - SIGEPA", passageiro="DEP", passageiro_e_deputado=True)
    assert rodar(base, "G04") == set()


def secretario(con, dep, nome, nivel=10):
    con.execute("INSERT INTO secretarios (deputado_id, nome, cargo, nivel) VALUES (?, ?, ?, ?)", [dep, nome, f"SP{nivel}", nivel])


def test_G04_ignora_passageiro_da_equipe(base):
    deputado(base, 1)
    secretario(base, 1, "MARIA DA SILVA SOUZA")
    gasto(base, 1, 900, categoria="PASSAGEM AÉREA - SIGEPA", passageiro="MARIA SOUZA", passageiro_e_deputado=False)
    assert REGRAS["G04"].fn(base) == []
    gasto(base, 1, 700, categoria="PASSAGEM AÉREA - SIGEPA", passageiro="JOSE PEREIRA LIMA", passageiro_e_deputado=False)
    alertas = REGRAS["G04"].fn(base)
    assert len(alertas) == 1 and alertas[0]["descricao"].startswith("1 passagens para 1 pessoa")
    assert alertas[0]["evidencias"][0]["valor"] == 700


def test_G04_equipe_de_outro_deputado_nao_conta(base):
    deputado(base, 1)
    deputado(base, 2)
    secretario(base, 2, "MARIA SOUZA")
    gasto(base, 1, 900, categoria="PASSAGEM AÉREA - SIGEPA", passageiro="MARIA SOUZA", passageiro_e_deputado=False)
    assert [a["deputado_id"] for a in REGRAS["G04"].fn(base)] == [1]


# G11 — fornecedor pessoa física com nome de secretário do gabinete
def test_G11_dispara(base):
    deputado(base, 1)
    secretario(base, 1, "JOAO CARLOS PEREIRA")
    gasto(base, 1, 3000, cnpj="12345678901", fornecedor="JOAO CARLOS PEREIRA")
    assert rodar(base, "G11") == {1}


def test_G11_nao_dispara_para_empresa_ou_outro_nome(base):
    deputado(base, 1)
    secretario(base, 1, "JOAO CARLOS PEREIRA")
    gasto(base, 1, 3000, cnpj="12345678000199", fornecedor="JOAO CARLOS PEREIRA")  # CNPJ: empresa
    gasto(base, 1, 3000, cnpj="98765432100", fornecedor="ANA LUIZA MOTA")
    assert rodar(base, "G11") == set()


# G12 — equipe acima do limite
def test_G12(base):
    deputado(base, 1)
    deputado(base, 2)
    for k in range(26):
        secretario(base, 1, f"PESSOA {k} TESTE")
    for k in range(25):
        secretario(base, 2, f"PESSOA {k} TESTE")
    assert rodar(base, "G12") == {1}


def emenda(con, dep, uf, empenhado, pix=False, codigo=None):
    codigo = codigo or f"{dep}-{uf}-{empenhado}-{pix}"
    con.execute("INSERT INTO emendas (codigo, ano, tipo, deputado_id, uf, empenhado, pago, pix) VALUES (?, 2025, 'Individual', ?, ?, ?, 0, ?)",
                [codigo, dep, uf, empenhado, pix])
    return codigo


# E01 — emendas fora do estado
def test_E01(base):
    deputado(base, 1, uf="SP")
    deputado(base, 2, uf="SP")
    emenda(base, 1, "SP", 2_000_000)
    emenda(base, 1, "BA", 1_500_000)
    emenda(base, 2, "SP", 9_000_000)
    emenda(base, 2, "RJ", 1_000_000)  # 10%: abaixo do limiar
    assert rodar(base, "E01") == {1}


# E02 — entidade privada concentrada
def favorecido(con, codigo, dep, nome, natureza, valor):
    con.execute("INSERT INTO emendas_favorecidos (codigo, deputado_id, favorecido, natureza, valor) VALUES (?, ?, ?, ?, ?)",
                [codigo, dep, nome, natureza, valor])


def test_E02(base):
    for d in (1, 2):
        deputado(base, d)
        c = emenda(base, d, "SP", 2_000_000)
        favorecido(base, c, d, "MUNICIPIO DE X", "Município", 1_000_000)
    favorecido(base, "x", 1, "ASSOCIACAO AMIGOS", "Associação Privada", 600_000)
    favorecido(base, "y", 2, "PREFEITURA Y", "Município", 5_000_000)
    assert rodar(base, "E02") == {1}


# E03 — maioria por transferência especial
def test_E03(base):
    deputado(base, 1)
    deputado(base, 2)
    emenda(base, 1, "SP", 2_000_000, pix=True)
    emenda(base, 1, "SP", 500_000)
    emenda(base, 2, "SP", 2_000_000)
    emenda(base, 2, "SP", 900_000, pix=True)
    assert rodar(base, "E03") == {1}


def test_P02_ausencia_justificada_nao_conta_como_falta(base):
    _presencas(base, 3)
    # as ausências do deputado 1 foram todas justificadas (registro oficial do dia)
    base.execute("INSERT INTO frequencia_dia VALUES ('2024-03-01', 1, 'Ausência justificada', 'Missão Autorizada')")
    assert rodar(base, "P02") == set()
    pct = base.execute("SELECT pct_presenca_sessoes, n_faltas_justificadas, n_faltas_sem_justificativa FROM indicadores "
                       "WHERE deputado_id = 1").fetchone()
    assert pct == (1.0, 7, 0)


def fornecedor(con, cnpj, abertura="2010-01-01", situacao="ATIVA", socios=None):
    con.execute("INSERT INTO fornecedores (cnpj, abertura, situacao, socios, sem_dados) VALUES (?, ?, ?, ?, false)",
                [cnpj, abertura, situacao, socios or []])


# G05 — CNPJ aberto < 6 meses antes do 1º pagamento
def test_G05_dispara(base):
    deputado(base, 1)
    fornecedor(base, "1" * 14, abertura="2023-10-01")
    gasto(base, 1, 500, cnpj="1" * 14, data="2024-01-10")
    assert rodar(base, "G05") == {1}


def test_G05_nao_dispara(base):
    deputado(base, 1)
    fornecedor(base, "1" * 14, abertura="2023-01-01")
    gasto(base, 1, 500, cnpj="1" * 14, data="2024-01-10")
    assert rodar(base, "G05") == set()


# G06 — fornecedor não ativo
def test_G06_dispara(base):
    deputado(base, 1)
    fornecedor(base, "1" * 14, situacao="BAIXADA")
    gasto(base, 1, 500, cnpj="1" * 14)
    assert rodar(base, "G06") == {1}


def test_G06_nao_dispara(base):
    deputado(base, 1)
    fornecedor(base, "1" * 14, situacao="ATIVA")
    gasto(base, 1, 500, cnpj="1" * 14)
    assert rodar(base, "G06") == set()


# G07 — sobrenome de sócio igual ao do deputado
def test_G07_dispara(base):
    deputado(base, 1, nome="Ana", nome_civil="Ana Maria Brandão Kowalski")
    fornecedor(base, "1" * 14, socios=[{"nome": "PEDRO KOWALSKI", "qualificacao": "Sócio", "entrada": None}])
    gasto(base, 1, 500, cnpj="1" * 14)
    assert rodar(base, "G07") == {1}


def test_G07_nao_dispara(base):
    deputado(base, 1, nome="Ana", nome_civil="Ana Maria da Silva")
    fornecedor(base, "1" * 14, socios=[{"nome": "PEDRO DA SILVA", "qualificacao": "Sócio", "entrada": None}])
    gasto(base, 1, 500, cnpj="1" * 14)
    assert rodar(base, "G07") == set()


# G08 — glosa > R$ 5 mil
def test_G08_dispara(base):
    deputado(base, 1)
    gasto(base, 1, 1000, valor_glosa=6000)
    assert rodar(base, "G08") == {1}


def test_G08_nao_dispara(base):
    deputado(base, 1)
    gasto(base, 1, 1000, valor_glosa=4000)
    assert rodar(base, "G08") == set()


# G09 — combustível alto em fim de semana/feriado
def _combustiveis(base):
    deputado(base, 1)
    for i in range(1, 21):
        gasto(base, 1, 100, categoria="COMBUSTÍVEIS E LUBRIFICANTES.", data=f"2024-03-{i:02d}")


def test_G09_dispara(base):
    _combustiveis(base)
    gasto(base, 1, 2000, categoria="COMBUSTÍVEIS E LUBRIFICANTES.", data="2024-12-25")  # Natal
    assert rodar(base, "G09") == {1}


def test_G09_nao_dispara(base):
    _combustiveis(base)
    gasto(base, 1, 2000, categoria="COMBUSTÍVEIS E LUBRIFICANTES.", data="2024-12-26")  # quinta-feira
    assert rodar(base, "G09") == set()


# G10 — fornecedor compartilhado por ≥ 10 deputados com valores muito acima da categoria
def _categoria(base, valor_compartilhado, n_deps=10):
    for d in range(1, n_deps + 1):
        deputado(base, d)
        gasto(base, d, valor_compartilhado, cnpj="9" * 14, categoria="CONSULTORIAS")
        gasto(base, d, 100, cnpj=f"{d:014d}", categoria="CONSULTORIAS")
        gasto(base, d, 100, cnpj=f"{d + 50:014d}", categoria="CONSULTORIAS")


def test_G10_dispara(base):
    _categoria(base, 500)
    assert rodar(base, "G10") == set(range(1, 11))


def test_G10_nao_dispara(base):
    _categoria(base, 500, n_deps=9)
    assert rodar(base, "G10") == set()


def votacoes_plen(base, n, votou: dict[int, int]):
    for i in range(n):
        base.execute("INSERT INTO votacoes (id, data, sigla_orgao) VALUES (?, ?, 'PLEN')", [f"v{i}", date(2024, 3, 1)])
    for dep, k in votou.items():
        for i in range(k):
            base.execute("INSERT INTO votos VALUES (?, ?, 'Sim', 'AAA', NULL)", [f"v{i}", dep])


# P01 — participação < 70%
def test_P01_dispara(base):
    deputado(base, 1)
    votacoes_plen(base, 10, {1: 6})
    assert rodar(base, "P01") == {1}


def test_P01_nao_dispara(base):
    deputado(base, 1)
    votacoes_plen(base, 10, {1: 7})
    assert rodar(base, "P01") == set()


# P02 — presença abaixo do percentil 10
def _presencas(base, faltoso_pres):
    for d in range(1, 12):
        deputado(base, d)
    for s in range(10):
        base.execute("INSERT INTO sessoes VALUES (?, '2024-03-01', 'S')", [s])
        for d in range(1, 12):
            presente = s < faltoso_pres if d == 1 else True
            base.execute("INSERT INTO presencas VALUES (?, ?, ?)", [s, d, presente])


def test_P02_dispara(base):
    _presencas(base, 3)
    assert rodar(base, "P02") == {1}


def test_P02_nao_dispara(base):
    _presencas(base, 10)
    assert rodar(base, "P02") == set()


# L01 — nenhuma proposição relevante em ≥ 12 meses
def test_L01_dispara(base):
    deputado(base, 1, inicio="2023-02-01")
    assert rodar(base, "L01") == {1}


def test_L01_nao_dispara(base):
    deputado(base, 1, inicio="2023-02-01")
    deputado(base, 2, inicio="2024-09-01")
    base.execute("INSERT INTO proposicoes (id, sigla_tipo, data_apresentacao, relevante) VALUES (1, 'PL', '2024-01-01', true)")
    base.execute("INSERT INTO autorias VALUES (1, 1, true, 1)")
    assert rodar(base, "L01") == set()


# L02 — gasta muito × entrega pouco
def _quadrante(base, gasto_do_1, props_do_1):
    for d in range(1, 9):
        deputado(base, d)
        gasto(base, d, gasto_do_1 if d == 1 else 1000 * d)
        n = props_do_1 if d == 1 else d
        for k in range(n):
            pid = d * 100 + k
            base.execute("INSERT INTO proposicoes (id, sigla_tipo, data_apresentacao, relevante) VALUES (?, 'PL', '2024-01-01', true)", [pid])
            base.execute("INSERT INTO autorias VALUES (?, ?, true, 1)", [pid, d])


def test_L02_dispara(base):
    _quadrante(base, 99999, 0)
    assert rodar(base, "L02") == {1}


def test_L02_nao_dispara(base):
    _quadrante(base, 99999, 9)
    assert rodar(base, "L02") == set()


# V01 — votou contra o partido em > 25%
def _alinhamento(base, contra):
    deputado(base, 1)
    for i in range(4):
        base.execute("INSERT INTO votacoes (id, data, sigla_orgao) VALUES (?, '2024-03-01', 'PLEN')", [f"v{i}"])
        base.execute("INSERT INTO orientacoes VALUES (?, 'AAA', 'Sim')", [f"v{i}"])
        base.execute("INSERT INTO votos VALUES (?, 1, ?, 'AAA', NULL)", [f"v{i}", "Não" if i < contra else "Sim"])


def test_V01_dispara(base):
    _alinhamento(base, 2)
    assert rodar(base, "V01") == {1}


def test_V01_nao_dispara(base):
    _alinhamento(base, 1)
    assert rodar(base, "V01") == set()


# V02 — troca de partido
def test_V02_dispara(base):
    deputado(base, 1)
    base.execute("INSERT INTO deputado_partidos VALUES (1, 'AAA', '2023-02-01', '2024-04-01'), (1, 'BBB', '2024-04-01', NULL)")
    alertas = REGRAS["V02"].fn(base)
    assert [a["deputado_id"] for a in alertas] == [1]
    assert alertas[0]["severidade"] == "info"


def test_V02_nao_dispara(base):
    deputado(base, 1)
    base.execute("INSERT INTO deputado_partidos VALUES (1, 'AAA', '2023-02-01', NULL)")
    assert rodar(base, "V02") == set()


def test_alerta_formato_e_evidencia_com_url(base):
    deputado(base, 1)
    gasto(base, 1, 900, categoria="PASSAGEM AÉREA - SIGEPA", passageiro="FULANO", passageiro_e_deputado=False,
          url_documento="https://doc/1.pdf")
    calcular_indicadores(base, INI, FIM)
    gerar_series(base)
    a = next(a for a in gerar_alertas(base) if a["regra"] == "G04")
    assert set(a) == {"id", "regra", "deputado_id", "severidade", "titulo", "descricao", "evidencias"}
    assert a["id"] == "G04-1"
    assert a["evidencias"][0]["url"] == "https://doc/1.pdf"


def test_G01_suplentes_curtos_nao_diluem_mediana(base):
    deputado(base, 1)  # mandato inteiro: ~100/mês
    gasto(base, 1, 2300)
    for d in (2, 3):   # suplentes de 2 meses: ~100/mês
        deputado(base, d, inicio="2024-11-01")
        gasto(base, d, 200)
    assert rodar(base, "G01") == set()


def test_L02_usa_taxas_mensais_entre_quem_tem_6_meses_ou_mais(base):
    deputado(base, 1)
    gasto(base, 1, 99999)
    _prop(base, 1, 1)
    for d, n in ((2, 5), (3, 6), (4, 7)):
        deputado(base, d)
        gasto(base, d, 1000 * d)
        _prop(base, d, n)
    for d in (10, 11, 12, 13, 14):  # suplentes recentes sem projetos não puxam o P25 para zero
        deputado(base, d, inicio="2024-11-01")
    assert rodar(base, "L02") == {1}


def _prop(base, dep, n):
    for k in range(n):
        pid = dep * 1000 + k
        base.execute("INSERT INTO proposicoes (id, sigla_tipo, data_apresentacao, relevante) VALUES (?, 'PL', '2024-01-01', true)", [pid])
        base.execute("INSERT INTO autorias VALUES (?, ?, true, 1)", [pid, dep])
