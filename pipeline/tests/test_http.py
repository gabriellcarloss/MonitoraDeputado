import os
import time

import httpx
import pytest
import respx

from monitora.http import Client


def test_download_uses_cache_when_fresh(tmp_path):
    dest = tmp_path / "a.csv"
    dest.write_text("cached")
    with respx.mock(assert_all_called=False) as m:
        route = m.get("https://ex.com/a.csv").respond(200, text="new")
        out = Client().download("https://ex.com/a.csv", dest, max_age_hours=1)
    assert out == dest
    assert dest.read_text() == "cached"
    assert not route.called


def test_download_refreshes_when_stale(tmp_path):
    dest = tmp_path / "a.csv"
    dest.write_text("cached")
    old = time.time() - 5 * 3600
    os.utime(dest, (old, old))
    with respx.mock:
        respx.get("https://ex.com/a.csv").respond(200, text="new")
        Client().download("https://ex.com/a.csv", dest, max_age_hours=1)
    assert dest.read_text() == "new"


def test_download_falls_back_to_stale_cache_on_error(tmp_path):
    dest = tmp_path / "a.csv"
    dest.write_text("cached")
    old = time.time() - 5 * 3600
    os.utime(dest, (old, old))
    c = Client(retries=2, backoff=0)
    with respx.mock:
        respx.get("https://ex.com/a.csv").mock(side_effect=httpx.ConnectError("down"))
        out = c.download("https://ex.com/a.csv", dest, max_age_hours=1)
    assert out == dest
    assert dest.read_text() == "cached"
    assert "ex.com" in c.stale_sources


def test_download_raises_without_cache(tmp_path):
    c = Client(retries=2, backoff=0)
    with respx.mock:
        respx.get("https://ex.com/a.csv").respond(500)
        with pytest.raises(httpx.HTTPError):
            c.download("https://ex.com/a.csv", tmp_path / "a.csv", max_age_hours=1)


def test_get_all_pages_follows_next():
    with respx.mock:
        respx.get("https://api.ex/deputados", params={"pagina": "2"}).respond(
            200, json={"dados": [{"id": 2}], "links": [{"rel": "self", "href": "x"}]}
        )
        respx.get("https://api.ex/deputados").respond(
            200,
            json={
                "dados": [{"id": 1}],
                "links": [{"rel": "next", "href": "https://api.ex/deputados?pagina=2"}],
            },
        )
        dados = Client(rate_per_host=1000).get_all_pages("https://api.ex/deputados", {"itens": 100})
    assert [d["id"] for d in dados] == [1, 2]


def test_retry_on_503_then_success():
    with respx.mock:
        respx.get("https://api.ex/x").mock(
            side_effect=[httpx.Response(503), httpx.Response(200, json={"ok": True})]
        )
        assert Client(backoff=0, rate_per_host=1000).get_json("https://api.ex/x") == {"ok": True}


def test_get_json_usa_cache_quando_api_cai(tmp_path):
    c = Client(backoff=0, retries=2, rate_per_host=1000, cache_dir=tmp_path)
    with respx.mock:
        respx.get("https://api.ex/y").respond(200, json={"v": 1})
        assert c.get_json("https://api.ex/y", {"a": 1}) == {"v": 1}
    with respx.mock:
        respx.get("https://api.ex/y").respond(503)
        assert c.get_json("https://api.ex/y", {"a": 1}) == {"v": 1}
    assert "api.ex" in c.stale_sources


def test_offline_nao_acessa_rede(tmp_path):
    dest = tmp_path / "a.csv"
    dest.write_text("cached")
    old = time.time() - 5 * 3600
    os.utime(dest, (old, old))
    c = Client(offline=True)
    with respx.mock(assert_all_called=False) as m:
        r = m.get("https://ex.com/a.csv").respond(200, text="new")
        assert c.download("https://ex.com/a.csv", dest, max_age_hours=1).read_text() == "cached"
    assert not r.called
