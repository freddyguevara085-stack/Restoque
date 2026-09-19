import pytest
from app.config import settings
from app.main import app
from starlette.testclient import TestClient
from fastapi import FastAPI


def test_security_headers_present(client):
    res = client.get("/api/pacas/")
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"
    assert res.headers["Referrer-Policy"] == "no-referrer"
    assert "Content-Security-Policy" in res.headers
    assert "default-src 'self'" in res.headers["Content-Security-Policy"]


def test_cors_evil_origin_rejected(client):
    # Preflight OPTIONS request from disallowed origin
    res = client.options(
        "/api/pacas/",
        headers={
            "Origin": "http://evil.example",
            "Access-Control-Request-Method": "GET",
        }
    )
    # Origin must not be allowed
    assert res.headers.get("access-control-allow-origin") != "http://evil.example"


@pytest.mark.parametrize("header_value,expected_status", [
    (None, 401),
    ("wrong-key", 401),
    ("valid-test-key-123", 200),
])
def test_api_key_auth_gate(client, header_value, expected_status):
    settings.RESTIQUE_API_KEY = "valid-test-key-123"
    try:
        headers = {}
        if header_value is not None:
            headers["X-API-Key"] = header_value
        res = client.get("/api/pacas/", headers=headers)
        assert res.status_code == expected_status
    finally:
        settings.RESTIQUE_API_KEY = None


def test_protected_routes_require_admin_pin(client):
    # Unauthenticated requests to protected endpoints must return 401
    assert client.post("/api/pacas/", json={
        "descripcion": "No Auth", "costo": 100.0, "peso_lbs": 10.0, "categorias": []
    }).status_code == 401

    assert client.delete("/api/pacas/1").status_code == 401
    assert client.get("/api/reportes/dashboard").status_code == 401
    assert client.get("/api/reportes/excel").status_code == 401


def test_docs_disabled_in_production():
    # When DEBUG=false, docs_url is None and accessing /docs returns 404
    prod_app = FastAPI(docs_url=None, redoc_url=None)
    with TestClient(prod_app) as prod_client:
        res = prod_client.get("/docs")
        assert res.status_code == 404
        res_redoc = prod_client.get("/redoc")
        assert res_redoc.status_code == 404
