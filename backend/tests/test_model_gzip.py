"""The 3D model is sent gzip-compressed (about 25% of its size) and byte-identical once decoded."""
import os
import sys
import tempfile
from pathlib import Path

import pytest

pytest.importorskip("mongomock_motor")
os.environ.update(MONGO_URL="mongodb://x", DB_NAME="t", JWT_SECRET="s" * 40, ADMIN_PASSWORD="pw", UPLOAD_DIR=tempfile.mkdtemp(), EMERGENT_LLM_KEY="")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture(scope="module")
def client():
    import motor.motor_asyncio as motor
    from mongomock_motor import AsyncMongoMockClient
    from fastapi.testclient import TestClient
    motor.AsyncIOMotorClient = AsyncMongoMockClient
    import server
    with TestClient(server.app) as c:
        yield c, server


def test_model_is_compressed_and_identical(client):
    c, server = client
    raw = Path(server.MODEL_PATH).read_bytes()
    r = c.get("/api/model", headers={"Accept-Encoding": "gzip"})
    assert r.status_code == 200 and r.headers["content-encoding"] == "gzip"
    assert r.headers["x-file-size"] == str(len(raw)) and "content-length" not in r.headers
    assert r.content == raw
    assert os.path.getsize(server._MODEL_GZ["path"]) < len(raw) * 0.35


def test_model_etag_and_plain_fallback(client):
    c, server = client
    raw = Path(server.MODEL_PATH).read_bytes()
    etag = c.get("/api/model", headers={"Accept-Encoding": "gzip"}).headers["etag"]
    assert c.get("/api/model", headers={"If-None-Match": etag}).status_code == 304
    plain = c.get("/api/model", headers={"Accept-Encoding": "identity"})
    assert plain.content == raw and "content-encoding" not in plain.headers
