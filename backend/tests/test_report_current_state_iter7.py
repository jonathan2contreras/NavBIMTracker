"""Iter7 - Bug fix: reportes por estado concreto reflejan estado ACTUAL (no eventos revertidos).

Deja la BBDD limpia (tags/teams creados aquí se eliminan al final).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def facade_object(session):
    r = session.get(f"{API}/objects", params={"search": "C1", "limit": 200})
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    # pick first with mark starting with C or L (facade)
    for it in items:
        m = it["mark"]
        if m and m[0] in ("C", "L") and any(ch.isdigit() for ch in m[:3]):
            return it["name"]
    pytest.skip("No facade object found")


@pytest.fixture(scope="module")
def team(session):
    r = session.post(f"{API}/teams", json={"nombre": "TEST_TeamIter7", "integrantes": ["QA"]})
    assert r.status_code == 200, r.text
    tid = r.json()["id"]
    yield {"id": tid, "nombre": "TEST_TeamIter7"}
    session.delete(f"{API}/teams/{tid}")


@pytest.fixture(scope="module")
def state(session, facade_object, team):
    """Cycle the panel fabricado -> enviado -> instalado (team). Cleanup deletes tag."""
    name = facade_object
    for st in ["fabricado", "enviado"]:
        r = session.put(f"{API}/tags", json={"object_name": name, "status": st})
        assert r.status_code == 200, r.text
    r = session.put(f"{API}/tags", json={
        "object_name": name, "status": "instalado",
        "team_id": team["id"], "team_name": team["nombre"],
    })
    assert r.status_code == 200, r.text
    yield {"name": name, "team": team}
    # Cleanup tag: clear status + observation (will delete if no observations)
    session.put(f"{API}/tags", json={"object_name": name, "status": None, "observation": ""})


def _report(session, **params):
    params.setdefault("from", "2020-01-01")
    params.setdefault("to", "2030-12-31")
    params.setdefault("facade", "all")
    params.setdefault("team", "all")
    r = session.get(f"{API}/report", params=params)
    assert r.status_code == 200, r.text
    return r.json()


# ------------ Tests ------------

class TestReportCurrentState:
    def test_installed_appears_in_report(self, session, state):
        data = _report(session, status="instalado")
        names = [it["name"] for it in data["items"]]
        assert state["name"] in names, f"Panel instalado no aparece: {names[:10]}"
        assert data["total"] >= 1

    def test_installed_filter_by_team(self, session, state):
        data = _report(session, status="instalado", team=state["team"]["id"])
        names = [it["name"] for it in data["items"]]
        assert state["name"] in names
        # every item must belong to that team
        for it in data["items"]:
            assert it["team_id"] == state["team"]["id"]

    def test_revert_removes_from_installed_report(self, session, state):
        # Revert to fabricado
        r = session.put(f"{API}/tags", json={"object_name": state["name"], "status": "fabricado"})
        assert r.status_code == 200, r.text

        # tags reflect current state
        tags = session.get(f"{API}/tags").json()
        assert tags[state["name"]]["status"] == "fabricado"

        # installed report NO longer contains it
        inst = _report(session, status="instalado")
        assert state["name"] not in [it["name"] for it in inst["items"]], \
            "Bug: panel revertido sigue apareciendo como instalado"

        # fabricado report DOES contain it
        fab = _report(session, status="fabricado")
        assert state["name"] in [it["name"] for it in fab["items"]]

    def test_status_all_keeps_full_history(self, session, state):
        data = _report(session, status="all")
        events = [it for it in data["items"] if it["name"] == state["name"]]
        statuses = [e["status"] for e in events]
        # We did: fabricado, enviado, instalado, fabricado
        assert statuses.count("fabricado") >= 2
        assert "enviado" in statuses
        assert "instalado" in statuses
        assert len(events) >= 4

    def test_day_report_filters_by_installation_day(self, session, state):
        # Re-install to today so we can filter by today's date
        from datetime import datetime, timezone
        # progression requires going through enviado again (since current is fabricado)
        r = session.put(f"{API}/tags", json={"object_name": state["name"], "status": "enviado"})
        assert r.status_code == 200, r.text
        r = session.put(f"{API}/tags", json={
            "object_name": state["name"], "status": "instalado",
            "team_id": state["team"]["id"], "team_name": state["team"]["nombre"],
        })
        assert r.status_code == 200, r.text
        today = datetime.now(timezone.utc).date().isoformat()
        data = _report(session, status="instalado", **{"from": today, "to": today})
        names = [it["name"] for it in data["items"]]
        assert state["name"] in names
        # yesterday range should NOT include it
        from datetime import timedelta
        y = (datetime.now(timezone.utc).date() - timedelta(days=2)).isoformat()
        y2 = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
        data2 = _report(session, status="instalado", **{"from": y, "to": y2})
        assert state["name"] not in [it["name"] for it in data2["items"]]

    def test_export_pdf_and_xlsx(self, session, state):
        for fmt, ct in [("pdf", "application/pdf"),
                        ("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]:
            r = session.get(f"{API}/report/export", params={
                "format": fmt, "from": "2020-01-01", "to": "2030-12-31",
                "status": "instalado", "facade": "all", "team": "all",
            })
            assert r.status_code == 200, r.text
            assert r.headers["content-type"].startswith(ct)
            assert len(r.content) > 200
