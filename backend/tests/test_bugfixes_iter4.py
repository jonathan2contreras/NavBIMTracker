"""Iteration 4 backend tests for two production bug fixes.

BUG FIX 1: stats.semana.actual should count ONLY objects whose CURRENT status
is 'instalado' (once per object, by latest install date). Not 'fabricado'.

BUG FIX 2: /api/stats (and /api/tags, /api/objects) must not 500 when the tags
collection contains malformed documents. fetch_tags_map skips them with warning.
"""
import os
import pytest
import requests
from pymongo import MongoClient

# Resolve public backend URL
FE_ENV_PATH = "/app/frontend/.env"
BASE_URL = None
if os.path.exists(FE_ENV_PATH):
    with open(FE_ENV_PATH) as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
BASE_URL = BASE_URL or os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

# Load backend env for direct mongo access
BACKEND_ENV = "/app/backend/.env"
_env = {}
with open(BACKEND_ENV) as f:
    for line in f:
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.strip().split("=", 1)
            _env[k] = v.strip().strip('"').strip("'")
MONGO_URL = _env["MONGO_URL"]
DB_NAME = _env["DB_NAME"]


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture(scope="module")
def obj_name(s):
    """Pick a facade C/L object, ensure clean baseline."""
    r = s.get(f"{API}/objects", params={"facade": "norte", "limit": 20}).json()
    # Pick an item with a mark starting C or L
    for it in r["items"]:
        if it.get("mark", "").startswith(("C", "L")):
            name = it["name"]
            # cleanup
            s.put(f"{API}/tags", json={"object_name": name, "status": None, "observation": ""})
            return name
    pytest.skip("No C/L facade object found")


def _weekly_actual(s):
    return s.get(f"{API}/stats").json()["semana"]["actual"]


# ---------- BUG FIX 1 ----------

def test_bug1_fabricado_does_not_increment_semana(s, obj_name):
    base = _weekly_actual(s)
    r = s.put(f"{API}/tags", json={"object_name": obj_name, "status": "fabricado"})
    assert r.status_code == 200
    assert _weekly_actual(s) == base, "Marcar 'fabricado' NO debe aumentar semana.actual"


def test_bug1_instalado_increments_semana(s, obj_name):
    base_no_this = _weekly_actual(s)  # currently fabricado for this obj
    r = s.put(f"{API}/tags", json={"object_name": obj_name, "status": "instalado"})
    assert r.status_code == 200
    assert _weekly_actual(s) == base_no_this + 1


def test_bug1_back_to_fabricado_decrements_semana(s, obj_name):
    before = _weekly_actual(s)
    r = s.put(f"{API}/tags", json={"object_name": obj_name, "status": "fabricado"})
    assert r.status_code == 200
    assert _weekly_actual(s) == before - 1


def test_bug1_clear_status_keeps_zero_contribution(s, obj_name):
    before = _weekly_actual(s)
    r = s.put(f"{API}/tags", json={"object_name": obj_name, "status": None})
    assert r.status_code == 200
    # was fabricado (no contribution), should stay same
    assert _weekly_actual(s) == before


def test_bug1_toggle_install_counts_once(s, obj_name):
    # instalado -> fabricado -> instalado : should be counted ONCE, not twice
    base = _weekly_actual(s)
    s.put(f"{API}/tags", json={"object_name": obj_name, "status": "instalado"})
    s.put(f"{API}/tags", json={"object_name": obj_name, "status": "fabricado"})
    s.put(f"{API}/tags", json={"object_name": obj_name, "status": "instalado"})
    assert _weekly_actual(s) == base + 1, "Ping-pong install/fabricate must count once"


def test_bug1_cleanup(s, obj_name):
    s.put(f"{API}/tags", json={"object_name": obj_name, "status": None, "observation": ""})
    # Verify semana.actual returned to baseline (obj cleared entirely)
    # Not strict; just ensures endpoint returns 200
    assert s.get(f"{API}/stats").status_code == 200


# ---------- BUG FIX 2 ----------

MALFORMED_NAME = "DOC_MALFORMADO_TEST_ITER4"


def test_bug2_setup_insert_malformed(mongo):
    mongo.tags.delete_many({"object_name": MALFORMED_NAME})
    mongo.tags.insert_one({
        "object_name": MALFORMED_NAME,
        "status": 123,             # invalid type
        "history": "no-es-lista",  # invalid type
        "observations": None,
        "observation": None,
    })
    assert mongo.tags.find_one({"object_name": MALFORMED_NAME}) is not None


def test_bug2_stats_still_200(s):
    r = s.get(f"{API}/stats")
    assert r.status_code == 200
    d = r.json()
    assert "counts" in d and "semana" in d and "total" in d
    assert isinstance(d["counts"], dict)


def test_bug2_tags_still_200(s):
    r = s.get(f"{API}/tags")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)
    # Malformed doc must NOT appear in the map
    assert MALFORMED_NAME not in r.json()


def test_bug2_objects_still_200(s):
    r = s.get(f"{API}/objects", params={"limit": 5})
    assert r.status_code == 200
    assert "items" in r.json()


def test_bug2_cleanup_malformed(mongo):
    res = mongo.tags.delete_many({"object_name": MALFORMED_NAME})
    assert res.deleted_count >= 1
    # verify endpoints still work post-cleanup
    r = requests.get(f"{API}/stats")
    assert r.status_code == 200
