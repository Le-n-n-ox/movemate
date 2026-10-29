"""Contract tests: verify all endpoints from Part B of the backend guide exist in openapi.json."""
import json
import urllib.request

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


# Endpoints from Part B of BACKEND_GUIDE.md (method, path)
# Note: openapi uses different param names than the guide (e.g., {ii_id} vs {inspection_item_id})
EXPECTED_ENDPOINTS = [
    ("GET", "/api/health"),
    ("POST", "/api/dev/seed"),
    ("GET", "/api/properties"),
    ("POST", "/api/properties"),
    ("PATCH", "/api/properties/{property_id}"),
    ("GET", "/api/properties/{property_id}"),
    ("POST", "/api/properties/{property_id}/rooms"),
    ("GET", "/api/rooms/{room_id}"),
    ("PATCH", "/api/rooms/{room_id}"),
    ("GET", "/api/rooms/{room_id}/locations"),
    ("POST", "/api/rooms/{room_id}/photo"),
    ("GET", "/api/rooms/{room_id}/sheet"),
    ("GET", "/api/properties/{property_id}/rooms"),
    ("POST", "/api/rooms/{room_id}/baseline/photo"),
    ("POST", "/api/rooms/{room_id}/baseline/video"),
    ("GET", "/api/rooms/{room_id}/items"),
    ("PATCH", "/api/items/{item_id}"),
    ("DELETE", "/api/items/{item_id}"),
    ("POST", "/api/rooms/{room_id}/items"),
    ("POST", "/api/items/{item_id}/condition"),
    ("GET", "/api/items/{item_id}/history"),
    ("POST", "/api/rooms/{room_id}/items/confirm-all"),
    ("GET", "/api/guest/{token}"),
    ("POST", "/api/guest/{token}/ask"),
    ("POST", "/api/properties/{property_id}/audits"),
    ("POST", "/api/audits/{audit_id}/rooms/{room_id}/video"),
    ("POST", "/api/audits/{audit_id}/rooms/{room_id}/frames"),
    ("POST", "/api/audits/{audit_id}/run"),
    ("GET", "/api/audits/{audit_id}"),
    ("PATCH", "/api/findings/{finding_id}"),
    ("POST", "/api/properties/{property_id}/inspections"),
    ("GET", "/api/properties/{property_id}/inspections"),
    ("GET", "/api/inspections/{inspection_id}"),
    ("PATCH", "/api/inspection-items/{ii_id}"),
    ("POST", "/api/inspection-items/{ii_id}/photo"),
    ("PATCH", "/api/cleaning-checks/{check_id}"),
    ("POST", "/api/inspections/{inspection_id}/ai-suggestions"),
    ("POST", "/api/inspections/{inspection_id}/complete"),
    ("GET", "/api/inspections/{inspection_id}/readiness"),
    ("GET", "/api/properties/{property_id}/discrepancies"),
    ("GET", "/api/discrepancies/{case_id}"),
    ("PATCH", "/api/discrepancies/{case_id}"),
    ("POST", "/api/discrepancies/{case_id}/events"),
    ("POST", "/api/discrepancies/{case_id}/resolve"),
]


def _normalize_path(path: str) -> str:
    """Normalize path params to a canonical form for comparison."""
    import re
    # Replace any {param_name} with {param}
    return re.sub(r"\{[^}]+\}", "{param}", path)


def test_openapi_contains_all_contract_endpoints():
    """Every endpoint in Part B must appear in the live openapi.json."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    
    # Build set of (method, normalized_path) from openapi
    actual = set()
    for path, methods in spec.get("paths", {}).items():
        for method in methods:
            if method.upper() in ("GET", "POST", "PUT", "PATCH", "DELETE"):
                actual.add((method.upper(), _normalize_path(path)))
    
    missing = []
    for method, path in EXPECTED_ENDPOINTS:
        if (method, _normalize_path(path)) not in actual:
            missing.append((method, path))
    
    assert not missing, f"Missing endpoints in openapi.json: {missing}"


def test_health_endpoint():
    """Health endpoint returns ok."""
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_meta_usage_endpoint():
    """Usage endpoint exists and returns expected shape."""
    r = client.get("/api/meta/usage")
    assert r.status_code == 200
    data = r.json()
    assert "total_cost" in data
    assert "by_model" in data
    assert "by_route" in data


def test_meta_cleanup_endpoint():
    """Cleanup endpoint exists and runs."""
    r = client.post("/api/meta/cleanup")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "completed"
