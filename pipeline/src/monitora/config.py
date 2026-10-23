"""Constantes do pipeline: fontes, períodos e caminhos."""
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CACHE_DIR = ROOT / "pipeline" / ".cache"
OUT_DIR = ROOT / "web" / "public" / "data"

LEGISLATURA = 57
INICIO_LEGISLATURA = date(2023, 2, 1)
FIM_LEGISLATURA = date(2027, 1, 31)
ANOS = list(range(2023, date.today().year + 1))

API = "https://dadosabertos.camara.leg.br/api/v2"
ARQ = "https://dadosabertos.camara.leg.br/arquivos"
CEAP_URL = "https://www.camara.leg.br/cotas/Ano-{ano}.csv.zip"
MINHA_RECEITA = "https://minhareceita.org/{cnpj}"
BRASIL_API = "https://brasilapi.com.br/api/cnpj/v1/{cnpj}"
# Serviço legado da Câmara: frequência diária no Plenário com a justificativa de cada ausência.
LEGADO = "https://www.camara.leg.br/SitCamaraWS"
FUNCIONARIOS_URL = f"{ARQ}/funcionarios/json/funcionarios.json"
EMENDAS_URL = ("https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/"
               "EmendasParlamentares.zip")
# Emendas a partir do orçamento de 2024: as de 2023 foram apresentadas em 2022, pela legislatura anterior.
ANO_INICIAL_EMENDAS = 2024

TIPOS_RELEVANTES = ("PL", "PLP", "PEC", "PDL")
TIPOS_REQUERIMENTO = ("REQ", "RIC", "INC", "MOC", "IND")

# Valor mensal da CEAP por UF (Ato da Mesa nº 43/2009, valores atualizados vigentes em 2024).
# Fonte: https://www2.camara.leg.br/transparencia/acesso-a-informacao/copy_of_perguntas-frequentes/cota-para-o-exercicio-da-atividade-parlamentar
# Conferir ao liberar a rede; usados apenas para % da cota utilizada.
COTA_MENSAL_UF = {
    "AC": 50426.26, "AL": 46737.90, "AM": 49363.92, "AP": 49168.58, "BA": 44804.65, "CE": 48245.57, "DF": 36582.46,
    "ES": 43217.71, "GO": 41300.86, "MA": 47945.49, "MG": 41886.51, "MS": 46336.64, "MT": 45221.83, "PA": 48021.25,
    "PB": 47826.36, "PE": 47470.60, "PI": 46765.57, "PR": 44665.66, "RJ": 41553.77, "RN": 48525.79, "RO": 49466.29,
    "RR": 51406.33, "RS": 46669.70, "SC": 45671.58, "SE": 45933.06, "SP": 42837.33, "TO": 45297.41,
}

# 50 sobrenomes mais comuns no Brasil — ignorados na regra G07 (coincidência de sobrenome).
SOBRENOMES_COMUNS = {
    "SILVA", "SANTOS", "OLIVEIRA", "SOUZA", "SOUSA", "RODRIGUES", "FERREIRA", "ALVES", "PEREIRA", "LIMA", "GOMES",
    "COSTA", "RIBEIRO", "MARTINS", "CARVALHO", "ALMEIDA", "LOPES", "SOARES", "FERNANDES", "VIEIRA", "BARBOSA",
    "ROCHA", "DIAS", "NASCIMENTO", "ANDRADE", "MOREIRA", "NUNES", "MARQUES", "MACHADO", "MENDES", "FREITAS",
    "CARDOSO", "RAMOS", "GONCALVES", "SANTANA", "TEIXEIRA", "ARAUJO", "PINTO", "MELO", "CAVALCANTI", "MONTEIRO",
    "MOURA", "CORREIA", "BATISTA", "JESUS", "REIS", "BORGES", "CAMPOS", "MIRANDA", "JUNIOR", "FILHO", "NETO", "SOBRINHO",
}

# Feriados nacionais fixos (MM-DD); móveis são calculados a partir da Páscoa.
FERIADOS_FIXOS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"]

# Remuneração (vencimento + gratificação, sem auxílios) do Secretário Parlamentar por nível SP01–SP25.
# Tabela da Câmara vigente desde 01/02/2025 (Lei 14.528/2023). Usada só para ESTIMAR o custo da equipe.
SALARIO_SP = {
    1: 2444.88, 2: 2806.54, 3: 3168.20, 4: 3529.86, 5: 3891.58, 6: 4253.18, 7: 4614.92, 8: 4976.56,
    9: 5338.24, 10: 5699.90, 11: 6061.60, 12: 6423.22, 13: 6784.90, 14: 7508.24, 15: 8231.54, 16: 8954.90,
    17: 9678.22, 18: 10401.56, 19: 11486.56, 20: 12571.56, 21: 13656.56, 22: 14741.56, 23: 15826.56,
    24: 17273.26, 25: 18719.88,
}
# Verba mensal de gabinete (Ato da Mesa 268/2023) e limite de secretários parlamentares por gabinete.
VERBA_GABINETE = 133170.54
MAX_SECRETARIOS = 25

UF_POR_NOME = {
    "ACRE": "AC", "ALAGOAS": "AL", "AMAPA": "AP", "AMAZONAS": "AM", "BAHIA": "BA", "CEARA": "CE", "DISTRITO FEDERAL": "DF",
    "ESPIRITO SANTO": "ES", "GOIAS": "GO", "MARANHAO": "MA", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS",
    "MINAS GERAIS": "MG", "PARA": "PA", "PARAIBA": "PB", "PARANA": "PR", "PERNAMBUCO": "PE", "PIAUI": "PI",
    "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS", "RONDONIA": "RO", "RORAIMA": "RR",
    "SANTA CATARINA": "SC", "SAO PAULO": "SP", "SERGIPE": "SE", "TOCANTINS": "TO",
}
