"""Sessões deliberativas do Plenário e presença dos deputados em exercício."""
import json
import logging
from datetime import date, timedelta
from pathlib import Path

import duckdb
from dateutil.relativedelta import relativedelta

from monitora import db
from monitora.config import API, CACHE_DIR
from monitora.http import Client

log = logging.getLogger(__name__)


def _tipos_deliberativos(client: Client) -> list[str]:
    ref = client.get_json(f"{API}/referencias/eventos/codTipoEvento")["dados"]
    return [str(r["cod"]) for r in ref if "sessão deliberativa" in (r.get("nome") or "").lower()]


def _meses(desde: date, ate: date):
    ini = desde.replace(day=1)
    while ini <= ate:
        fim = min(ini + relativedelta(months=1) - timedelta(days=1), ate)
        yield max(ini, desde), fim
        ini += relativedelta(months=1)


def extract_presencas(client: Client, con: duckdb.DuckDBPyConnection, desde: date, ate: date | None = None,
                      cache_dir: Path = CACHE_DIR) -> None:
    ate = ate or date.today()
    pasta = cache_dir / "sessoes"
    pasta.mkdir(parents=True, exist_ok=True)
    tipos = _tipos_deliberativos(client)
    sessoes: dict[int, dict] = {}
    for ini, fim in _meses(desde, ate):
        eventos = client.get_all_pages(f"{API}/eventos", {
            "codTipoEvento": tipos, "dataInicio": ini.isoformat(), "dataFim": fim.isoformat(), "itens": 100})
        for ev in eventos:
            if (ev.get("situacao") or "").lower() != "encerrada":
                continue
            arq = pasta / f"{ev['id']}.json"
            if arq.exists():
                sessoes[ev["id"]] = json.loads(arq.read_text())
                continue
            presentes = [d["id"] for d in client.get_json(f"{API}/eventos/{ev['id']}/deputados")["dados"]]
            info = {"data": ev["dataHoraInicio"][:10], "tipo": ev.get("descricaoTipo"), "presentes": presentes}
            arq.write_text(json.dumps(info))
            sessoes[ev["id"]] = info

    con.execute("CREATE OR REPLACE TABLE sessoes (id BIGINT, data DATE, tipo VARCHAR)")
    con.execute("CREATE OR REPLACE TEMP TABLE _presentes (sessao_id BIGINT, deputado_id BIGINT)")
    db.inserir(con, "sessoes", [(i, s["data"], s["tipo"]) for i, s in sessoes.items()])
    db.inserir(con, "_presentes", [(i, d) for i, s in sessoes.items() for d in s["presentes"]])
    con.execute("""
    CREATE OR REPLACE TABLE presencas AS
    SELECT s.id AS sessao_id, e.deputado_id, p.deputado_id IS NOT NULL AS presente
    FROM sessoes s
    JOIN exercicios e ON s.data >= e.inicio AND (e.fim IS NULL OR s.data < e.fim)
    LEFT JOIN _presentes p ON p.sessao_id = s.id AND p.deputado_id = e.deputado_id;
    DROP TABLE _presentes;
    """)
    log.info("sessões: %d", len(sessoes))
