def test_create_paca_persists_quantities(client, admin_headers):
    res = client.post("/api/pacas/", json={
        "descripcion": "Paca Mixta Verano",
        "costo": 2000.0,
        "peso_lbs": 50.0,
        "categorias": [
            {"nombre": "Premium", "cantidad_total": 20, "precio_venta": 150.0},
            {"nombre": "Regular", "cantidad_total": 40, "precio_venta": 80.0},
        ]
    }, headers=admin_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["descripcion"] == "Paca Mixta Verano"
    assert len(data["categorias"]) == 2
    for cat in data["categorias"]:
        assert cat["cantidad_disponible"] == cat["cantidad_total"]


def test_create_paca_empty_categories(client, admin_headers):
    res = client.post("/api/pacas/", json={
        "descripcion": "Paca Sin Clasificar",
        "costo": 1500.0,
        "peso_lbs": 30.0,
        "categorias": []
    }, headers=admin_headers)
    assert res.status_code == 201
    assert res.json()["categorias"] == []


def test_create_paca_validation_errors(client, admin_headers):
    # Negative costo -> 422
    res = client.post("/api/pacas/", json={
        "descripcion": "Invalida",
        "costo": -100.0,
        "peso_lbs": 20.0,
    }, headers=admin_headers)
    assert res.status_code == 422

    # Empty descripcion -> 422
    res = client.post("/api/pacas/", json={
        "descripcion": "",
        "costo": 100.0,
        "peso_lbs": 20.0,
    }, headers=admin_headers)
    assert res.status_code == 422

    # > 50 categorias -> 422
    over_cats = [{"nombre": f"Cat {i}", "cantidad_total": 1, "precio_venta": 50.0} for i in range(51)]
    res = client.post("/api/pacas/", json={
        "descripcion": "Exceso Categorias",
        "costo": 1000.0,
        "peso_lbs": 20.0,
        "categorias": over_cats,
    }, headers=admin_headers)
    assert res.status_code == 422


def test_list_and_delete_paca(client, admin_headers):
    # Create paca
    res = client.post("/api/pacas/", json={
        "descripcion": "Paca Para Borrar",
        "costo": 1200.0,
        "peso_lbs": 25.0,
        "categorias": [{"nombre": "Basica", "cantidad_total": 10, "precio_venta": 50.0}]
    }, headers=admin_headers)
    paca_id = res.json()["id"]

    # List shows created paca
    list_res = client.get("/api/pacas/")
    assert any(p["id"] == paca_id for p in list_res.json())

    # Delete returns 204
    del_res = client.delete(f"/api/pacas/{paca_id}", headers=admin_headers)
    assert del_res.status_code == 204

    # Immediate visibility check
    list_after = client.get("/api/pacas/")
    assert not any(p["id"] == paca_id for p in list_after.json())

    # Deleting missing paca returns 404
    del_again = client.delete(f"/api/pacas/{paca_id}", headers=admin_headers)
    assert del_again.status_code == 404


def test_add_prendas_branches(client, admin_headers):
    res = client.post("/api/pacas/", json={
        "descripcion": "Paca Merge Test",
        "costo": 1000.0,
        "peso_lbs": 20.0,
        "categorias": [
            {"nombre": "Premium", "cantidad_total": 10, "precio_venta": 150.0}
        ]
    }, headers=admin_headers)
    paca_id = res.json()["id"]

    # 1. Same name (case-insensitive + whitespace) & same price accumulates
    add1 = client.post(f"/api/pacas/{paca_id}/prendas", json={
        "nombre": "  premium  ",
        "cantidad": 5,
        "precio_venta": 150.0,
    }, headers=admin_headers)
    assert add1.status_code == 200
    cats = add1.json()["categorias"]
    assert len(cats) == 1
    assert cats[0]["cantidad_total"] == 15
    assert cats[0]["cantidad_disponible"] == 15

    # 2. Same name, different price -> new category
    add2 = client.post(f"/api/pacas/{paca_id}/prendas", json={
        "nombre": "Premium",
        "cantidad": 4,
        "precio_venta": 200.0,
    }, headers=admin_headers)
    assert add2.status_code == 200
    cats = add2.json()["categorias"]
    assert len(cats) == 2

    # 3. New name -> new category
    add3 = client.post(f"/api/pacas/{paca_id}/prendas", json={
        "nombre": "Económica",
        "cantidad": 12,
        "precio_venta": 40.0,
    }, headers=admin_headers)
    assert add3.status_code == 200
    cats = add3.json()["categorias"]
    assert len(cats) == 3
