"""Download dos arquivos anuais em lote de dadosabertos.camara.leg.br."""
from datetime import date
from pathlib import Path

from monitora.config import ARQ
from monitora.http import Client


def arquivo_anual(client: Client, nome: str, ano: int, cache_dir: Path) -> str:
    max_age = 20 if ano >= date.today().year else 24 * 30
    url = f"{ARQ}/{nome}/csv/{nome}-{ano}.csv"
    return str(client.download(url, cache_dir / "arquivos" / f"{nome}-{ano}.csv", max_age_hours=max_age))


def ler_csv(arquivos: list[str]) -> str:
    """Expressão read_csv padrão para os arquivos da Câmara (';', tudo texto)."""
    return f"read_csv({arquivos!r}, delim=';', header=true, all_varchar=true, quote='\"', union_by_name=true)"
