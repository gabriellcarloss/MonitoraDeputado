"""Download dos arquivos anuais em lote de dadosabertos.camara.leg.br."""
import logging
from datetime import date
from pathlib import Path

import httpx

from monitora.config import ARQ
from monitora.http import Client


log = logging.getLogger(__name__)


def ainda_nao_publicado(e: Exception, ano: int) -> bool:
    """404 de um arquivo do ano corrente (ex.: 1º de janeiro): o arquivo ainda não existe."""
    return (isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 404 and ano >= date.today().year)


def arquivo_anual(client: Client, nome: str, ano: int, cache_dir: Path) -> str | None:
    max_age = 20 if ano >= date.today().year else 24 * 30
    url = f"{ARQ}/{nome}/csv/{nome}-{ano}.csv"
    try:
        return str(client.download(url, cache_dir / "arquivos" / f"{nome}-{ano}.csv", max_age_hours=max_age))
    except httpx.HTTPStatusError as e:
        if ainda_nao_publicado(e, ano):
            log.warning("%s-%s ainda não publicado; ignorado", nome, ano)
            return None
        raise


def anuais(client: Client, nome: str, anos: list[int], cache_dir: Path) -> list[str]:
    return [a for a in (arquivo_anual(client, nome, ano, cache_dir) for ano in anos) if a]


def ler_csv(arquivos: list[str]) -> str:
    """Expressão read_csv padrão para os arquivos da Câmara (';', tudo texto)."""
    return f"read_csv({arquivos!r}, delim=';', header=true, all_varchar=true, quote='\"', union_by_name=true)"
