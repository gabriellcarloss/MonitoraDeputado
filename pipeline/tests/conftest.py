import pytest

from monitora import db
from monitora.http import Client


@pytest.fixture
def con():
    c = db.connect()
    yield c
    c.close()


@pytest.fixture
def client():
    return Client(rate_per_host=10_000, backoff=0, retries=2)
