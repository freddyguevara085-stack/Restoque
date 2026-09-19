def test_venta_happy_path(client, admin_headers):
    # Seed paca with categories
    p_res = client.post("/api/pacas/", json={
        "descripcion": "Paca Ventas Happy",
        "costo": 1000.0,
        "peso_lbs": 20.0,
        "categorias": [
            {"nombre": "Camisas", "cantidad_total": 5, "precio_venta": 120.0},
            {"nombre": "Pantalones", "cantidad_total": 3, "precio_venta": 250.0},
        ]
    }, headers=admin_headers)
    cats = p_res.json()["categorias"]
    cat1_id = cats[0]["id"]
    cat2_id = cats[1]["id"]

    # Sell 2 camisas (2*120=240) and 1 pantalon (1*250=250) -> total 490
    venta_res = client.post("/api/ventas/", json={
        "items": [
            {"paca_categoria_id": cat1_id, "cantidad": 2},
            {"paca_categoria_id": cat2_id, "cantidad": 1},
        ]
    })
    assert venta_res.status_code == 201
    venta = venta_res.json()
    assert venta["total"] == 490.0
    assert len(venta["items"]) == 2

    # Verify stock decrements
    paca_check = client.get(f"/api/pacas/{p_res.json()['id']}").json()
    assert paca_check["categorias"][0]["cantidad_disponible"] == 3
    assert paca_check["categorias"][1]["cantidad_disponible"] == 2


def test_venta_exact_stock_boundary(client, admin_headers):
    # Seed 1 item in stock
    p_res = client.post("/api/pacas/", json={
        "descripcion": "Paca Exact Stock",
        "costo": 500.0,
        "peso_lbs": 10.0,
        "categorias": [
            {"nombre": "Exclusivo", "cantidad_total": 1, "precio_venta": 300.0}
        ]
    }, headers=admin_headers)
    cat_id = p_res.json()["categorias"][0]["id"]

    # Sell exact stock (1) -> 201
    v1 = client.post("/api/ventas/", json={
        "items": [{"paca_categoria_id": cat_id, "cantidad": 1}]
    })
    assert v1.status_code == 201

    # Attempt to sell again when stock is 0 -> 400 (atomic rowcount == 0 boundary)
    v2 = client.post("/api/ventas/", json={
        "items": [{"paca_categoria_id": cat_id, "cantidad": 1}]
    })
    assert v2.status_code == 400
    assert "Stock insuficiente" in v2.json()["detail"]


def test_venta_insufficient_stock_rollback(client, admin_headers):
    # Seed 2 items
    p_res = client.post("/api/pacas/", json={
        "descripcion": "Paca Rollback",
        "costo": 500.0,
        "peso_lbs": 10.0,
        "categorias": [
            {"nombre": "Vestido", "cantidad_total": 2, "precio_venta": 150.0}
        ]
    }, headers=admin_headers)
    paca_id = p_res.json()["id"]
    cat_id = p_res.json()["categorias"][0]["id"]

    # Request 3 items (3 > 2) -> 400
    fail_res = client.post("/api/ventas/", json={
        "items": [{"paca_categoria_id": cat_id, "cantidad": 3}]
    })
    assert fail_res.status_code == 400

    # Verify stock remained intact at 2
    paca_check = client.get(f"/api/pacas/{paca_id}").json()
    assert paca_check["categorias"][0]["cantidad_disponible"] == 2


def test_venta_unknown_category_and_validation(client):
    # Unknown paca_categoria_id -> 400
    res_unknown = client.post("/api/ventas/", json={
        "items": [{"paca_categoria_id": 999999, "cantidad": 1}]
    })
    assert res_unknown.status_code == 400
    assert "no encontrada" in res_unknown.json()["detail"]

    # Empty items -> 422
    res_empty = client.post("/api/ventas/", json={"items": []})
    assert res_empty.status_code == 422

    # Quantity < 1 -> 422
    res_zero = client.post("/api/ventas/", json={
        "items": [{"paca_categoria_id": 1, "cantidad": 0}]
    })
    assert res_zero.status_code == 422


def test_delete_venta_restores_stock(client, admin_headers):
    # Seed paca with categories
    p_res = client.post("/api/pacas/", json={
        "descripcion": "Paca para anular",
        "costo": 1000.0,
        "peso_lbs": 20.0,
        "categorias": [
            {"nombre": "Camisas", "cantidad_total": 5, "precio_venta": 120.0},
        ]
    }, headers=admin_headers)
    paca_id = p_res.json()["id"]
    cat_id = p_res.json()["categorias"][0]["id"]

    # Sell 2 camisas
    venta_res = client.post("/api/ventas/", json={
        "items": [{"paca_categoria_id": cat_id, "cantidad": 2}]
    })
    venta_id = venta_res.json()["id"]

    # Verify stock decrements
    paca_check = client.get(f"/api/pacas/{paca_id}").json()
    assert paca_check["categorias"][0]["cantidad_disponible"] == 3

    # Delete venta
    del_res = client.delete(f"/api/ventas/{venta_id}", headers=admin_headers)
    assert del_res.status_code == 204

    # Verify stock is restored
    paca_check_restored = client.get(f"/api/pacas/{paca_id}").json()
    assert paca_check_restored["categorias"][0]["cantidad_disponible"] == 5

    # Verify venta is gone
    del_res_again = client.delete(f"/api/ventas/{venta_id}", headers=admin_headers)
    assert del_res_again.status_code == 404
