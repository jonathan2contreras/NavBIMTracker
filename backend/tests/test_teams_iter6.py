"""Iteration 6 backend tests: Teams CRUD, teams stats, and tag+team attribution."""
import os
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL and os.path.exists("/app/frontend/.env"):
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"

TEST_TEAM_PREFIX = f"TEST_ITER6_{datetime.now(timezone.utc).strftime('%H%M%S%f')}"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    yield sess
    # cleanup any teams we created
    try:
        for t in sess.get(f"{API}/teams").json():
            if t["nombre"].startswith("TEST_ITER6_"):
                sess.delete(f"{API}/teams/{t['id']}")
    except Exception:
        pass


@pytest.fixture(scope="module")
def facade_obj(s):
    r = s.get(f"{API}/objects", params={"facade": "norte", "limit": 30}).json()
    for it in r["items"]:
        if it["mark"] and it["mark"][0] in ("C", "L"):
            return it["name"]
    pytest.skip("No facade object found")


# ---- Teams CRUD ----
def test_list_teams_ok(s):
    r = s.get(f"{API}/teams")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_team_empty_name_rejected(s):
    r = s.post(f"{API}/teams", json={"nombre": "  ", "integrantes": []})
    assert r.status_code == 422


def test_create_team_ok(s):
    name = f"{TEST_TEAM_PREFIX}_A"
    r = s.post(f"{API}/teams", json={"nombre": name, "integrantes": ["Juan", " Maria ", ""]})
    assert r.status_code == 200
    d = r.json()
    assert d["nombre"] == name
    # empty strings trimmed away
    assert d["integrantes"] == ["Juan", "Maria"]
    assert d.get("id")
    pytest.team_id = d["id"]
    # verify persistence via list
    lst = s.get(f"{API}/teams").json()
    ids = [t["id"] for t in lst]
    assert d["id"] in ids


def test_update_team_ok(s):
    tid = pytest.team_id
    new_name = f"{TEST_TEAM_PREFIX}_A_upd"
    r = s.put(f"{API}/teams/{tid}", json={"nombre": new_name, "integrantes": ["Pedro"]})
    assert r.status_code == 200
    d = r.json()
    assert d["nombre"] == new_name
    assert d["integrantes"] == ["Pedro"]
    # verify persistence
    lst = s.get(f"{API}/teams").json()
    updated = next(t for t in lst if t["id"] == tid)
    assert updated["nombre"] == new_name
    assert updated["integrantes"] == ["Pedro"]


def test_update_team_bad_id_404(s):
    r = s.put(f"{API}/teams/not-a-real-id", json={"nombre": "x"})
    assert r.status_code == 404


def test_delete_team_ok(s):
    # create a throwaway then delete
    name = f"{TEST_TEAM_PREFIX}_del"
    tid = s.post(f"{API}/teams", json={"nombre": name}).json()["id"]
    r = s.delete(f"{API}/teams/{tid}")
    assert r.status_code == 200
    assert r.json().get("deleted") is True
    lst = s.get(f"{API}/teams").json()
    assert tid not in [t["id"] for t in lst]


# ---- Teams stats ----
def test_teams_stats_shape(s):
    r = s.get(f"{API}/teams/stats")
    assert r.status_code == 200
    d = r.json()
    for k in ("total_facade", "total_installed", "teams", "sin_equipo"):
        assert k in d
    assert isinstance(d["teams"], list)
    for t in d["teams"]:
        for k in ("id", "nombre", "instalados", "pct_total", "pct_instalados", "paneles"):
            assert k in t
    assert "instalados" in d["sin_equipo"]
    assert "paneles" in d["sin_equipo"]


# ---- Tag + team attribution ----
def test_tag_instalado_with_team_attaches_team_and_stats_counts(s, facade_obj):
    tid = pytest.team_id
    # ensure team still exists (may have been renamed above; recreate if missing)
    lst = s.get(f"{API}/teams").json()
    if tid not in [t["id"] for t in lst]:
        tid = s.post(f"{API}/teams", json={"nombre": f"{TEST_TEAM_PREFIX}_B"}).json()["id"]
        pytest.team_id = tid
    team_name = next(t for t in s.get(f"{API}/teams").json() if t["id"] == tid)["nombre"]

    # clear then set instalado with team
    s.put(f"{API}/tags", json={"object_name": facade_obj, "status": None, "observation": ""})
    r = s.put(f"{API}/tags", json={
        "object_name": facade_obj,
        "status": "instalado",
        "observation": "",
        "team_id": tid,
        "team_name": team_name,
    })
    assert r.status_code == 200
    d = r.json()
    # find latest instalado history entry and confirm team attached
    inst = [ev for ev in d["history"] if ev.get("status") == "instalado"]
    assert inst, "no instalado history"
    assert inst[-1].get("team_id") == tid
    assert inst[-1].get("team_name") == team_name

    # stats should attribute this panel to the team
    stats = s.get(f"{API}/teams/stats").json()
    t_row = next((t for t in stats["teams"] if t["id"] == tid), None)
    assert t_row is not None
    panel_names = [p["object_name"] for p in t_row["paneles"]]
    assert facade_obj in panel_names
    assert t_row["instalados"] >= 1
    # percentages present and coherent
    assert 0 <= t_row["pct_total"] <= 100
    assert 0 <= t_row["pct_instalados"] <= 100

    # cleanup: clear status (keeps history? the endpoint deletes if no obs)
    s.put(f"{API}/tags", json={"object_name": facade_obj, "status": None, "observation": ""})


def test_tag_instalado_without_team_goes_to_sin_equipo(s, facade_obj):
    # find a *different* facade object
    r = s.get(f"{API}/objects", params={"facade": "norte", "limit": 50}).json()
    target = None
    for it in r["items"]:
        if it["mark"] and it["mark"][0] in ("C", "L") and it["name"] != facade_obj:
            target = it["name"]
            break
    if not target:
        pytest.skip("no second facade object")
    s.put(f"{API}/tags", json={"object_name": target, "status": None, "observation": ""})
    r2 = s.put(f"{API}/tags", json={"object_name": target, "status": "instalado", "observation": ""})
    assert r2.status_code == 200
    stats = s.get(f"{API}/teams/stats").json()
    panels = [p["object_name"] for p in stats["sin_equipo"]["paneles"]]
    assert target in panels
    # cleanup
    s.put(f"{API}/tags", json={"object_name": target, "status": None, "observation": ""})
