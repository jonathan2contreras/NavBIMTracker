"""Daily report exports (PDF / Excel) must survive hostile text and phone-sized photos."""
import io
import os
import sys
import tempfile
from pathlib import Path

import pytest

pytest.importorskip("mongomock_motor")
os.environ.update(MONGO_URL="mongodb://x", DB_NAME="t", JWT_SECRET="s" * 40, ADMIN_PASSWORD="pw", UPLOAD_DIR=tempfile.mkdtemp(), EMERGENT_LLM_KEY="")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PIL import Image  # noqa: E402

RANGE = {"from": "2020-01-01", "to": "2099-12-31", "status": "all"}


def jpeg(w, h, orientation=None):
    out = io.BytesIO()
    kw = {}
    if orientation:
        exif = Image.Exif()
        exif[0x0112] = orientation
        kw["exif"] = exif.tobytes()
    Image.effect_noise((w, h), 80).convert("RGB").save(out, "JPEG", quality=92, **kw)
    return out.getvalue()


@pytest.fixture(scope="module")
def app():
    import motor.motor_asyncio as motor
    from mongomock_motor import AsyncMongoMockClient
    from fastapi.testclient import TestClient
    motor.AsyncIOMotorClient = AsyncMongoMockClient
    import server
    with TestClient(server.app, raise_server_exceptions=False) as client:
        token = client.post("/api/admin/verify", json={"password": "pw"}).json()["token"]
        yield client, {"Authorization": f"Bearer {token}"}, sorted(server.FACADE_NAMES), server


@pytest.fixture()
def put(app):
    client, headers, names, server = app
    state = {"i": 0}

    def _put(obs="", photo=None, team=None):
        name = names[state["i"]]
        state["i"] += 1
        path = None
        if photo:
            path = client.post("/api/upload", files={"file": ("f.jpg", photo, "image/jpeg")}, headers=headers).json()["path"]
        for status in ("fabricado", "enviado", "instalado"):
            body = {"object_name": name, "status": status, "observation": obs if status == "instalado" else "", "photo": path if status == "instalado" else None}
            if status == "instalado" and team:
                body.update(team_id=team[0], team_name=team[1])
            assert client.put("/api/tags", json=body, headers=headers).status_code == 200
        return name
    return _put


def export(app, fmt="pdf", **extra):
    client = app[0]
    return client.get("/api/report/export", params={"format": fmt, **RANGE, **extra})


@pytest.mark.parametrize("text", ["Cambio R&D pendiente", "Holgura <2cm y >5mm", "Revisar <b>sello</b> <br> y <unknown>", "<para><font size=999>", "línea 1\nlínea 2", "tab\x0bvertical \x00nul"])
def test_pdf_survives_markup_and_control_characters(app, put, text):
    put(text, team=("t1", "Equipo A&B <norte>"))
    r = export(app)
    assert r.status_code == 200 and r.content.startswith(b"%PDF")


def test_pdf_survives_an_observation_longer_than_a_page(app, put):
    put("Texto largo. " * 800)
    assert export(app).status_code == 200


def test_photos_are_embedded_as_small_thumbnails(app, put):
    for _ in range(8):
        put("foto", photo=jpeg(4000, 3000))
    r = export(app)
    assert r.status_code == 200
    assert len(r.content) < 3_000_000  # eight 4000x3000 originals used to add ~100 MB


def test_thumbnail_applies_the_exif_rotation_and_is_small(app):
    server = app[3]
    client, headers = app[0], app[1]
    path = client.post("/api/upload", files={"file": ("f.jpg", jpeg(1200, 800, orientation=6), "image/jpeg")}, headers=headers).json()["path"]
    data, w, h = server._pdf_thumbnail(path)
    assert h > w and max(w, h) <= server.PDF_THUMB_PX  # landscape pixels + "rotate 90" tag = portrait photo
    assert len(data) < 60_000


def test_unreadable_photo_does_not_break_the_report(app, put):
    client, headers, names, server = app
    path = client.post("/api/upload", files={"file": ("x.jpg", b"not an image", "image/jpeg")}, headers=headers).json()["path"]
    name = put("sin foto válida")
    doc = client.put("/api/tags", json={"object_name": name, "status": "instalado", "observation": "con foto rota", "photo": path}, headers=headers)
    assert doc.status_code == 200
    assert export(app).status_code == 200


def test_excel_survives_control_characters(app, put):
    put("celda con \x0b caracter de control y \x00 nulo")
    r = export(app, "xlsx")
    assert r.status_code == 200 and r.content[:2] == b"PK"


def test_teams_exports_survive_markup(app, put):
    client, headers, names, server = app
    team = client.post("/api/teams", json={"nombre": "Equipo <b>A</b> & Cía", "integrantes": []}, headers=headers).json()
    put("ok", team=(team["id"], team["nombre"]))
    for fmt in ("pdf", "xlsx"):
        assert client.get("/api/teams/export", params={"format": fmt}).status_code == 200


def test_filename_cannot_inject_headers(app):
    r = export(app, **{"from": '2026-01-01"; x=1'})
    assert r.status_code in (200, 422)
    assert '"; x=1' not in r.headers.get("content-disposition", "")


def test_a_generation_failure_is_reported_clearly(app, monkeypatch):
    server = app[3]
    monkeypatch.setattr(server, "make_pdf", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")))
    r = export(app)
    assert r.status_code == 500 and "No se pudo generar" in r.json()["detail"]
