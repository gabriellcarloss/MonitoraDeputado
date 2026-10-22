"""Dados FICTÍCIOS de demonstração, gerados pelo mesmo pipeline de métricas e exportação.

Usados no desenvolvimento do site e no CI. Nomes, partidos e empresas são inventados;
o meta.json sai com "ficticio": true e o site exibe um aviso.
"""
import random
from datetime import date, timedelta
from pathlib import Path

from monitora import db
from monitora.export import exportar
from monitora.extract.votacoes import resolver_orientacoes
from monitora.metrics.alertas import gerar_alertas
from monitora.metrics.indicadores import calcular_indicadores
from monitora.metrics.rede import gerar_rede
from monitora.metrics.series import gerar_series
from monitora.schema import criar_tabelas

INICIO, FIM = date(2023, 2, 1), date(2025, 6, 30)
BANCADAS = {"SP": 70, "MG": 53, "RJ": 46, "BA": 39, "RS": 31, "PR": 30, "PE": 25, "CE": 22, "MA": 18, "PA": 17, "GO": 17,
            "SC": 16, "PB": 12, "ES": 10, "PI": 10, "AL": 9, "RN": 8, "AM": 8, "MT": 8, "MS": 8, "DF": 8, "SE": 8, "RO": 8,
            "TO": 8, "AC": 8, "AP": 8, "RR": 8}
PARTIDOS = ["PALF", "PBET", "PGAM", "PDEL", "PEPS", "PZET", "PETA", "PTET"]
NOMES = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabriela", "Heitor", "Iara", "João", "Karina", "Lucas",
         "Marina", "Nelson", "Olívia", "Paulo", "Queila", "Rafael", "Sílvia", "Tiago", "Úrsula", "Vítor", "Wanda", "Yuri"]
SOBRENOMES = ["Arantes", "Bastos", "Coutinho", "Drummond", "Esteves", "Falcão", "Guimarães", "Holanda", "Ipiranga",
              "Jardim", "Kruger", "Leal", "Macedo", "Nogueira", "Otoni", "Prado", "Quintela", "Rezende", "Siqueira",
              "Toledo", "Uchoa", "Valadares", "Werneck", "Xavier", "Zanetti"]
CATEGORIAS = [  # (categoria, valor médio, notas por mês)
    ("PASSAGEM AÉREA - SIGEPA", 1400, 3), ("COMBUSTÍVEIS E LUBRIFICANTES.", 350, 4), ("DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.", 6000, 1),
    ("MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR", 2500, 2), ("TELEFONIA", 250, 1),
    ("LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES", 7000, 1), ("CONSULTORIAS, PESQUISAS E TRABALHOS TÉCNICOS.", 9000, 0.3),
    ("HOSPEDAGEM ,EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL.", 600, 0.5),
]


def _meses(ini: date, fim: date):
    d = ini.replace(day=1)
    while d <= fim:
        yield d
        d = (d + timedelta(days=32)).replace(day=1)


def _popular(con, n_deputados: int, rnd: random.Random) -> None:
    ufs = rnd.choices(list(BANCADAS), weights=list(BANCADAS.values()), k=n_deputados)
    deps, exerc, partidos, perfil = [], [], [], {}
    for i, uf in enumerate(ufs, start=1):
        nome = f"{rnd.choice(NOMES)} {rnd.choice(SOBRENOMES)}"
        civil = f"{nome.split()[0]} {rnd.choice(SOBRENOMES)} {nome.split()[1]}"
        partido = rnd.choice(PARTIDOS)
        suplente = i % 12 == 0
        ini = date(2024, 3, 1) if suplente else INICIO
        fim = date(2025, 1, 15) if suplente and i % 24 == 0 else None
        deps.append((i, nome, civil, rnd.choice("MF"), uf, partido, None, f"dep{i}@exemplo.invalid", "{}", [],
                     rnd.choice(["Superior", "Pós-Graduação", "Médio"]), date(1960 + i % 30, 1 + i % 12, 1 + i % 28),
                     "Exercício" if fim is None else "Fim de Mandato", "Suplente" if suplente else "Titular", ini, fim))
        exerc.append((i, ini, fim))
        if i % 10 == 3:
            outro = rnd.choice([p for p in PARTIDOS if p != partido])
            partidos += [(i, outro, ini, date(2024, 4, 5)), (i, partido, date(2024, 4, 5), None)]
        else:
            partidos.append((i, partido, ini, None))
        perfil[i] = {"nome": nome, "civil": civil, "uf": uf, "partido": partido, "ini": ini, "fim": fim or FIM,
                     "gasto": rnd.choice([0.6, 0.9, 1.0, 1.1, 1.4, 2.4]), "presenca": rnd.uniform(0.55, 0.99),
                     "alinhamento": rnd.uniform(0.6, 0.99), "props": rnd.choice([0, 0, 1, 2, 4, 6, 10, 18]),
                     "terceiros": i % 7 == 0}
    db.inserir(con, "deputados", deps)
    db.inserir(con, "exercicios", exerc)
    db.inserir(con, "deputado_partidos", partidos)

    cnpjs = [f"{rnd.randrange(10**13, 10**14)}" for _ in range(220)]
    compartilhados = cnpjs[:6]
    forn = []
    for k, c in enumerate(cnpjs):
        recente = k % 25 == 5
        socio_sob = rnd.choice(SOBRENOMES) if k % 30 == 0 else "Exemplar"
        forn.append((c, f"EMPRESA EXEMPLO {k:03d} LTDA", None, date(2024, 1, 1) if recente else date(2005 + k % 15, 1, 1),
                     "BAIXADA" if k % 40 == 7 else "ATIVA", "Serviços", "CIDADE EXEMPLO", rnd.choice(list(BANCADAS)),
                     [{"nome": f"{rnd.choice(NOMES).upper()} {socio_sob.upper()}", "qualificacao": "Sócio-Administrador",
                       "entrada": None}], 10000.0, False))
    db.inserir(con, "fornecedores", forn)

    desp, ide = [], 1
    for dep, p in perfil.items():
        favoritos = rnd.sample(cnpjs, 8) + compartilhados[:2]
        for m in _meses(p["ini"], min(p["fim"], FIM)):
            for cat, media, freq in CATEGORIAS:
                n = int(freq) + (rnd.random() < freq % 1)
                for _ in range(n):
                    valor = round(max(20, rnd.gauss(media, media / 3)) * p["gasto"] * (3 if rnd.random() < 0.02 else 1), 2)
                    dia = m + timedelta(days=rnd.randrange(0, 27))
                    passageiro = trecho = eh = None
                    if cat.startswith("PASSAGEM"):
                        terceiro = p["terceiros"] and rnd.random() < 0.3
                        passageiro = f"{rnd.choice(NOMES)} {rnd.choice(SOBRENOMES)}".upper() if terceiro else p["civil"].upper()
                        trecho = rnd.choice(["BSB/GRU", "GRU/BSB", "BSB/GIG", "BSB/CNF", "BSB/SSA", "BSB/POA"])
                        eh = not terceiro
                    c = rnd.choice(favoritos)
                    glosa = round(valor * 0.5, 2) if rnd.random() < 0.01 else 0.0
                    desp.append((ide, dep, dia, f"{m:%Y-%m}", cat, None, f"EMPRESA EXEMPLO {cnpjs.index(c):03d} LTDA", c,
                                 str(ide), valor, glosa, round(valor - glosa, 2), passageiro, trecho, None, eh))
                    ide += 1
    db.inserir(con, "despesas", desp)

    votacoes, votos, orient = [], [], []
    for v in range(420):
        dia = INICIO + timedelta(days=rnd.randrange(30, (FIM - INICIO).days))
        vid = f"{9000 + v}-{v % 90}"
        votacoes.append((vid, dia, "PLEN" if v % 7 else "CCJC", f"Votação de exemplo nº {v + 1}", rnd.choice([0, 1]),
                         None, 0, 0, 0))
        oriente = {pa: rnd.choice(["Sim", "Não", "Sim", "Liberado"]) for pa in PARTIDOS + ["Governo"]}
        orient += [(vid, b, o) for b, o in oriente.items()]
        for dep, p in perfil.items():
            if not (p["ini"] <= dia < p["fim"]) or rnd.random() > p["presenca"]:
                continue
            o = oriente[p["partido"]]
            voto = o if o != "Liberado" and rnd.random() < p["alinhamento"] else rnd.choice(["Sim", "Não"])
            votos.append((vid, dep, voto, p["partido"], dia))
    db.inserir(con, "votacoes", votacoes)
    db.inserir(con, "votos", votos)
    db.inserir(con, "orientacoes", orient)
    resolver_orientacoes(con)

    sessoes, pres = [], []
    for s in range(240):
        dia = INICIO + timedelta(days=rnd.randrange(10, (FIM - INICIO).days))
        sessoes.append((s + 1, dia, "Sessão Deliberativa"))
        pres += [(s + 1, dep, rnd.random() < p["presenca"]) for dep, p in perfil.items() if p["ini"] <= dia < p["fim"]]
    db.inserir(con, "sessoes", sessoes)
    db.inserir(con, "presencas", pres)

    props, aut, rel, pid = [], [], [], 1
    for dep, p in perfil.items():
        for tipo, qtd in (("PL", p["props"]), ("PEC", p["props"] // 6), ("REQ", p["props"] * 3 + rnd.randrange(0, 5))):
            for _ in range(qtd):
                dia = p["ini"] + timedelta(days=rnd.randrange(0, max(1, (min(p["fim"], FIM) - p["ini"]).days)))
                situacao = "Transformado em Norma Jurídica" if tipo == "PL" and rnd.random() < 0.05 else "Aguardando Parecer"
                props.append((pid, tipo, pid, dia.year, f"Proposição fictícia {pid} sobre {rnd.choice(['saúde', 'educação', 'segurança', 'economia', 'meio ambiente'])}",
                              rnd.choice(["Saúde", "Educação", "Segurança", "Economia", "Meio Ambiente"]), dia, situacao,
                              tipo in ("PL", "PEC"), None))
                aut.append((pid, dep, True, 1))
                if rnd.random() < 0.3:
                    aut.append((pid, rnd.choice(list(perfil)), False, 2))
                if tipo == "PL" and rnd.random() < 0.2:
                    rel.append((pid, rnd.choice(list(perfil)), "CCJC"))
                pid += 1
    db.inserir(con, "proposicoes", props)
    db.inserir(con, "autorias", aut)
    db.inserir(con, "relatorias", rel)


def gerar_ficticios(out_dir: Path, n_deputados: int = 513, seed: int = 42) -> None:
    con = db.connect()
    criar_tabelas(con)
    _popular(con, n_deputados, random.Random(seed))
    calcular_indicadores(con, INICIO, FIM)
    gerar_series(con)
    gerar_rede(con)
    exportar(con, Path(out_dir), gerar_alertas(con), stale=set(), extra_meta={"ficticio": True})
