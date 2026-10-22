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


def _tokens(s: str) -> list[str]:
    return [t for t in nome(s).split(" ") if t and t not in _PARTICULAS]


def mesmo_nome(a: str | None, b: str | None) -> bool:
    ta, tb = _tokens(a or ""), _tokens(b or "")
    if not ta or not tb:
        return False
    if ta == tb:
        return True
    return ta[0] == tb[0] and ta[-1] == tb[-1]
