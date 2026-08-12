"""Backend tests for new features: photo upload, tag photo, weekly stats."""
import io
import os
import pytest
import requests
from datetime import datetime, timezone

FE_ENV_PATH = "/app/frontend/.env"
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if os.path.exists(FE_ENV_PATH):
    with open(FE_ENV_PATH) as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"

# 1x1 red PNG
PNG_BYTES = bytes.fromhex(
    "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
    "890000000D49444154789C6360F84F0400000501010A2E7B99790000000049454E44AE426082"
)


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---- Upload ----
def test_upload_png_ok(s):
    files = {"file": ("test.png", io.BytesIO(PNG_BYTES), "image/png")}
    r = s.post(f"{API}/upload", files=files)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "path" in d and d["path"].startswith("bimtracker/uploads/")
    pytest.uploaded_path = d["path"]


def test_upload_rejects_text(s):
    files = {"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")}
    r = s.post(f"{API}/upload", files=files)
    assert r.status_code == 422


def test_files_get_ok(s):
    path = pytest.uploaded_path
    r = s.get(f"{API}/files/{path}")
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("image/")
    assert len(r.content) > 0


def test_files_get_404(s):
    r = s.get(f"{API}/files/bimtracker/uploads/nonexistent-abc.png")
    assert r.status_code == 404


# ---- Tag with photo ----
TAG_OBJ = None
UNIQUE_MARK = f"TEST_new_photo_{datetime.now(timezone.utc).strftime('%H%M%S%f')}"


def _pick_facade_obj(s):
    r = s.get(f"{API}/objects", params={"facade": "norte", "limit": 5}).json()
    for it in r["items"]:
        # prefer C/L (facade marks)
        if it["mark"][0] in ("C", "L"):
            return it["name"]
    return r["items"][0]["name"]


def test_tag_with_photo_creates_observation(s):
    global TAG_OBJ
    TAG_OBJ = _pick_facade_obj(s)
    # cleanup any prior state
    s.put(f"{API}/tags", json={"object_name": TAG_OBJ, "status": None, "observation": ""})
    # upload photo
    files = {"file": ("obra.png", io.BytesIO(PNG_BYTES), "image/png")}
    up = s.post(f"{API}/upload", files=files).json()
    photo_path = up["path"]
    # PUT tag with photo + text
    r = s.put(f"{API}/tags", json={
        "object_name": TAG_OBJ,
        "status": "instalado",
        "observation": UNIQUE_MARK,
        "photo": photo_path,
    })
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "instalado"
    obs = d["observations"]
    assert obs and obs[-1].get("photo") == photo_path
    assert obs[-1].get("text") == UNIQUE_MARK
    # verify via GET
    g = s.get(f"{API}/object", params={"name": TAG_OBJ}).json()
    assert g["observations"][-1].get("photo") == photo_path


def test_tag_photo_without_text(s):
    files = {"file": ("obra2.png", io.BytesIO(PNG_BYTES), "image/png")}
    up = s.post(f"{API}/upload", files=files).json()
    r = s.put(f"{API}/tags", json={
        "object_name": TAG_OBJ,
        "observation": "",
        "photo": up["path"],
    })
    assert r.status_code == 200
    obs = r.json()["observations"]
    assert obs[-1]["photo"] == up["path"]
    assert obs[-1]["text"] == ""


def test_clear_status_preserves_photo_observations(s):
    r = s.put(f"{API}/tags", json={"object_name": TAG_OBJ, "status": None, "observation": ""})
    assert r.status_code == 200
    g = s.get(f"{API}/object", params={"name": TAG_OBJ}).json()
    assert g["status"] is None
    # observations must remain (photos there)
    assert any(o.get("photo") for o in g["observations"])


# ---- Stats semana ----
def test_stats_includes_semana(s):
    r = s.get(f"{API}/stats")
    assert r.status_code == 200
    d = r.json()
    assert "semana" in d
    sem = d["semana"]
    for k in ("actual", "anterior", "desde", "hasta"):
        assert k in sem
    assert isinstance(sem["actual"], int)
    assert isinstance(sem["anterior"], int)


def test_stats_weekly_actual_increments_on_install(s):
    # pick a facade object with mark starting with C or L
    r = s.get(f"{API}/objects", params={"facade": "norte", "limit": 50}).json()
    target = None
    for it in r["items"]:
        if it["mark"][0] in ("C", "L") and it["name"] != TAG_OBJ:
            target = it["name"]
            break
    if not target:
        pytest.skip("No facade C/L object available")
    # cleanup
    s.put(f"{API}/tags", json={"object_name": target, "status": None, "observation": ""})
    before = s.get(f"{API}/stats").json()["semana"]["actual"]
    # mark installed
    r2 = s.put(f"{API}/tags", json={"object_name": target, "status": "instalado", "observation": UNIQUE_MARK})
    assert r2.status_code == 200
    after = s.get(f"{API}/stats").json()["semana"]["actual"]
    assert after == before + 1, f"expected +1 weekly install (before={before}, after={after})"
    # cleanup status but keep observation so it does not get counted again if re-set
    s.put(f"{API}/tags", json={"object_name": target, "status": None, "observation": ""})
