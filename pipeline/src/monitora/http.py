"""Cliente HTTP com limite de taxa por host, retry exponencial e cache em disco."""
import logging
import time
from pathlib import Path
from urllib.parse import urlparse

import httpx

log = logging.getLogger(__name__)

_RETRY_STATUS = {429, 500, 502, 503, 504}


class Client:
    def __init__(self, rate_per_host: float = 5.0, retries: int = 5, backoff: float = 1.0, timeout: float = 120):
        self.min_interval = 1.0 / rate_per_host
        self.retries = retries
        self.backoff = backoff
        self.stale_sources: set[str] = set()
        self._last: dict[str, float] = {}
        self._http = httpx.Client(timeout=timeout, follow_redirects=True,
                                  headers={"User-Agent": "MonitoraDeputado/0.1 (+github.com/gabriellcarloss/MonitoraDeputado)",
                                           "Accept": "application/json"})

    def _wait(self, host: str) -> None:
        dt = time.monotonic() - self._last.get(host, 0)
        if dt < self.min_interval:
            time.sleep(self.min_interval - dt)
        self._last[host] = time.monotonic()

    def _get(self, url: str, params=None) -> httpx.Response:
        host = urlparse(url).hostname or ""
        for tentativa in range(self.retries):
            self._wait(host)
            try:
                r = self._http.get(url, params=params)
                if r.status_code in _RETRY_STATUS and tentativa < self.retries - 1:
                    raise httpx.HTTPStatusError(f"status {r.status_code}", request=r.request, response=r)
                r.raise_for_status()
                return r
            except httpx.HTTPError as e:
                if tentativa == self.retries - 1:
                    raise
                espera = self.backoff * 2 ** tentativa
                log.warning("falha em %s (%s); nova tentativa em %.1fs", url, e, espera)
                time.sleep(espera)
        raise RuntimeError("unreachable")

    def get_json(self, url: str, params=None) -> dict:
        return self._get(url, params).json()

    def get_all_pages(self, url: str, params=None) -> list[dict]:
        dados: list[dict] = []
        pagina = self.get_json(url, params)
        while True:
            dados.extend(pagina.get("dados", []))
            prox = next((l["href"] for l in pagina.get("links", []) if l.get("rel") == "next"), None)
            if not prox:
                return dados
            pagina = self.get_json(prox)

    def download(self, url: str, dest: Path, max_age_hours: float) -> Path:
        dest = Path(dest)
        if dest.exists() and (time.time() - dest.stat().st_mtime) < max_age_hours * 3600:
            return dest
        try:
            r = self._get(url)
        except httpx.HTTPError:
            if dest.exists():
                log.warning("usando cache desatualizado para %s", url)
                self.stale_sources.add(urlparse(url).hostname or url)
                return dest
            raise
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_suffix(dest.suffix + ".part")
        tmp.write_bytes(r.content)
        tmp.replace(dest)
        return dest
