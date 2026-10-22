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
