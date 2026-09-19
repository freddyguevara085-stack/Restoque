import pytest
from starlette.testclient import TestClient
from app.main import app
from app.config import settings
from app.routers.reportes import sanitize_excel_cell


def test_sanitize_excel_cell():
    # Previene inyección de fórmulas (CWE-1236)
    assert sanitize_excel_cell("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert sanitize_excel_cell("+cmd|' /C calc'!A0") == "'+cmd|' /C calc'!A0"
    assert sanitize_excel_cell("-10+5") == "'-10+5"
    assert sanitize_excel_cell("@SUM(1,2)") == "'@SUM(1,2)"
    assert sanitize_excel_cell("Camisa Polo") == "Camisa Polo"
    assert sanitize_excel_cell(150.0) == 150.0


def test_security_headers_and_cors():
    with TestClient(app, headers={'X-API-Key': 'restoque-prod-key-2026-super-secure'}) as client:
        res = client.get("/api/pacas/")
        # Security headers
        assert res.headers["x-content-type-options"] == "nosniff"
        assert res.headers["x-frame-options"] == "DENY"
        assert res.headers["referrer-policy"] == "no-referrer"
        assert "default-src 'self'" in res.headers["content-security-policy"]

        # Evil origin check: evil.example must NOT be reflected
        res_cors = client.options(
            "/api/pacas/",
            headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "GET"},
        )
        assert res_cors.headers.get("access-control-allow-origin") != "http://evil.example"


def test_api_key_auth_gate():
    # Simulate API Key configuration
    original_key = settings.RESTIQUE_API_KEY
    try:
        settings.RESTIQUE_API_KEY = "test-secret-pos-key"
        with TestClient(app, headers={'X-API-Key': 'restoque-prod-key-2026-super-secure'}) as client:
            # Without API Key -> 401
            res = client.get("/api/pacas/")
            assert res.status_code == 401
            assert "API Key" in res.json().get("detail", "")

            # With wrong API Key -> 401
            res = client.get("/api/pacas/", headers={"X-API-Key": "wrong-key"})
            assert res.status_code == 401

            # With correct API Key -> 200
            res = client.get("/api/pacas/", headers={"X-API-Key": "test-secret-pos-key"})
            assert res.status_code == 200
    finally:
        settings.RESTIQUE_API_KEY = original_key


def test_auth_pin_and_protected_routes():
    with TestClient(app, headers={'X-API-Key': 'restoque-prod-key-2026-super-secure'}) as client:
        # 1. PIN incorrecto debe ser rechazado con 401
        res = client.post("/api/auth/verify-pin", json={"pin": "0000"})
        assert res.status_code == 401

        # 2. PIN correcto (1234 por defecto) debe devolver token HMAC
        res = client.post("/api/auth/verify-pin", json={"pin": "1234"})
        assert res.status_code == 200
        token = res.json().get("token")
        assert token is not None and len(token) > 64

        # 3. Rutas protegidas sin token deben dar 401
        res = client.get("/api/reportes/dashboard")
        assert res.status_code == 401

        res = client.get("/api/reportes/excel")
        assert res.status_code == 401

        res = client.post("/api/pacas/", json={
            "descripcion": "Test Paca",
            "costo": 1000,
            "peso_lbs": 50,
            "categorias": []
        })
        assert res.status_code == 401

        # 4. Rutas protegidas con token Bearer deben responder exitosamente
        auth_headers = {"Authorization": f"Bearer {token}"}
        res = client.get("/api/reportes/dashboard", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "ventas_hoy" in data
        assert "inversion_total" in data
        assert "ganancia_neta" in data

        # 5. Descarga de excel con token Bearer
        res = client.get("/api/reportes/excel", headers=auth_headers)
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def test_overselling_prevention():
    with TestClient(app, headers={'X-API-Key': 'restoque-prod-key-2026-super-secure'}) as client:
        # Login admin para crear una paca de prueba con stock limitado
        token = client.post("/api/auth/verify-pin", json={"pin": "1234"}).json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        paca_res = client.post("/api/pacas/", json={
            "descripcion": "Paca Test Sobrevendimiento",
            "costo": 500.0,
            "peso_lbs": 25.0,
            "categorias": [
                {"nombre": "Limitada", "cantidad_total": 2, "precio_venta": 100.0}
            ]
        }, headers=headers)
        assert paca_res.status_code in (200, 201)
        paca_id = paca_res.json()["id"]
        cat_id = paca_res.json()["categorias"][0]["id"]

        try:
            # Intentar vender más prendas de las disponibles (3 > 2)
            fail_res = client.post("/api/ventas/", json={
                "items": [{"paca_categoria_id": cat_id, "cantidad": 3}]
            })
            assert fail_res.status_code == 400
            assert "Stock insuficiente" in fail_res.json()["detail"]

            # Comprobar que el stock sigue intacto (2 disp)
            pacas_after = client.get("/api/pacas/").json()
            test_paca = next(p for p in pacas_after if p["id"] == paca_id)
            assert test_paca["categorias"][0]["cantidad_disponible"] == 2

            # Vender una cantidad válida (1 de 2)
            ok_res = client.post("/api/ventas/", json={
                "items": [{"paca_categoria_id": cat_id, "cantidad": 1}]
            })
            assert ok_res.status_code in (200, 201)
            assert ok_res.json()["total"] == 100.0

            # Verificar que el stock disminuyó exactamente en 1
            pacas_after_sale = client.get("/api/pacas/").json()
            test_paca2 = next(p for p in pacas_after_sale if p["id"] == paca_id)
            assert test_paca2["categorias"][0]["cantidad_disponible"] == 1
        finally:
            # Limpiar la paca de prueba
            client.delete(f"/api/pacas/{paca_id}", headers=headers)


def test_delete_paca_immediate_visibility():
    with TestClient(app, headers={'X-API-Key': 'restoque-prod-key-2026-super-secure'}) as client:
        token = client.post("/api/auth/verify-pin", json={"pin": "1234"}).json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        paca_res = client.post("/api/pacas/", json={
            "descripcion": "Paca Inmediata Test",
            "costo": 100.0,
            "peso_lbs": 10.0,
            "categorias": []
        }, headers=headers)
        assert paca_res.status_code in (200, 201)
        paca_id = paca_res.json()["id"]

        del_res = client.delete(f"/api/pacas/{paca_id}", headers=headers)
        assert del_res.status_code == 204

        # Inmediatamente después del 204, el GET no debe contener la paca
        list_res = client.get("/api/pacas/")
        assert list_res.status_code == 200
        all_pacas = list_res.json()
        assert not any(p["id"] == paca_id for p in all_pacas)

