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
