"""Backend tests for the new /api/object/mesh endpoint used by PanelPreview."""
import os
import time
import pytest
import requests

FE_ENV_PATH = "/app/frontend/.env"
BASE_URL = None
if os.path.exists(FE_ENV_PATH):
    with open(FE_ENV_PATH) as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


def _validate_mesh(d, expected_name=None):
    assert set(["name", "positions", "indices", "size"]).issubset(d.keys())
    if expected_name:
        assert d["name"] == expected_name
    assert isinstance(d["positions"], list) and len(d["positions"]) > 0
    assert len(d["positions"]) % 3 == 0
    assert isinstance(d["indices"], list) and len(d["indices"]) > 0
    assert len(d["indices"]) % 3 == 0
    assert isinstance(d["size"], list) and len(d["size"]) == 3
    for v in d["size"]:
        assert isinstance(v, (int, float))
    # sanity numeric
    for v in d["positions"][:30]:
        assert isinstance(v, (int, float))


def test_mesh_known_c1(s):
    name = "C1 C1 [6420986]"
    r = s.get(f"{API}/object/mesh", params={"name": name})
    assert r.status_code == 200, r.text
    d = r.json()
    _validate_mesh(d, expected_name=name)
    # vertex count = positions/3 = 2712
    verts = len(d["positions"]) // 3
    assert verts == 2712, f"expected 2712 verts, got {verts}"
    # size match dims (~2.99, 5.7187, 0.25)
    sx, sy, sz = d["size"]
    # compare with GET /api/object dims
    ob = s.get(f"{API}/object", params={"name": name}).json()
    ancho = ob.get("ancho")
    alto = ob.get("alto")
    # ancho/alto typically correspond to the two largest axes; check that the max two match
    dims_sorted = sorted([sx, sy, sz], reverse=True)
    obj_two = sorted([x for x in [ancho, alto] if x], reverse=True)
    for a, b in zip(dims_sorted[:2], obj_two):
        assert abs(a - b) < 0.02, f"mesh size {dims_sorted} vs object dims {obj_two}"


def test_mesh_404_unknown(s):
    r = s.get(f"{API}/object/mesh", params={"name": "NON_EXISTENT_XYZ_MESH"})
    assert r.status_code == 404


def test_mesh_cache_second_call_fast(s):
    name = "C1 C1 [6420986]"
    # warm
    s.get(f"{API}/object/mesh", params={"name": name})
    t0 = time.time()
    r = s.get(f"{API}/object/mesh", params={"name": name})
    dt = time.time() - t0
    assert r.status_code == 200
    assert dt < 1.0, f"second call too slow: {dt:.2f}s"


def test_mesh_multiple_objects(s):
    r = s.get(f"{API}/objects", params={"limit": 5}).json()
    items = r["items"]
    assert len(items) >= 3
    for it in items[:5]:
        name = it["name"]
        rr = s.get(f"{API}/object/mesh", params={"name": name})
        assert rr.status_code == 200, f"{name} -> {rr.status_code}"
        _validate_mesh(rr.json(), expected_name=name)


def test_mesh_non_facade_object(s):
    # find a non-facade object (mark doesn't start with C/L+digit)
    r = s.get(f"{API}/objects", params={"limit": 200}).json()
    non_fac = [it for it in r["items"] if not it.get("facade")]
    if not non_fac:
        pytest.skip("no non-facade object exposed via /api/objects (all are facade)")
    name = non_fac[0]["name"]
    rr = s.get(f"{API}/object/mesh", params={"name": name})
    assert rr.status_code == 200
    _validate_mesh(rr.json(), expected_name=name)


def test_mesh_missing_name_param(s):
    r = s.get(f"{API}/object/mesh")
    assert r.status_code == 422
