"""Normalização de nomes, documentos e texto."""
import re
import unicodedata


def nome(s: str | None) -> str:
    if not s:
        return ""
    sem_acento = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", sem_acento).strip().upper()


def cnpj(s: str | None) -> str | None:
    if not s:
        return None
    digitos = re.sub(r"\D", "", s)
    return digitos if len(digitos) in (11, 14) else None


_PARTICULAS = {"DE", "DA", "DO", "DAS", "DOS", "E"}
_SUFIXOS = {"JR": "JUNIOR", "JUNIOR": "JUNIOR", "FILHO": "FILHO", "FO": "FILHO", "NETO": "NETO", "SOBRINHO": "SOBRINHO"}


def _partes(s: str) -> tuple[list[str], str | None]:
    """Tokens do nome (sem partículas) e o sufixo geracional (Júnior, Filho, Neto…), aceitando 'SOBRENOME/NOME'."""
    n = nome(s)
    if "/" in n:
        sobrenome, _, prenome = n.partition("/")
        n = f"{prenome} {sobrenome}"
    tokens = [t for t in re.split(r"[^A-Z0-9]+", n) if t and t not in _PARTICULAS]
    sufixo = None
    while tokens and tokens[-1] in _SUFIXOS:
        sufixo = _SUFIXOS[tokens.pop()]
    return tokens, sufixo


def mesmo_nome(a: str | None, b: str | None) -> bool:
    """Mesmo nome se todos os tokens do nome mais curto estão no mais longo (token truncado conta como prefixo)
    e o sufixo geracional é igual — 'JOAO PAULO BACELAR' (filho) não casa com 'JOAO CARLOS BACELAR'."""
    ta, sa = _partes(a or "")
    tb, sb = _partes(b or "")
    if len(ta) < 2 or len(tb) < 2 or sa != sb:
        return False
    curto, longo = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    return all(t in longo or (len(t) >= 3 and any(x.startswith(t) for x in longo)) for t in curto)
