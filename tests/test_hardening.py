import asyncio

import pytest
from pydantic import ValidationError
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.config import Settings, settings
from app.database import async_session, engine
from app import crud
from app.models import PacaCategoria
from app.schemas import CategoriaIn, PacaCreate, VentaCreate, VentaItemIn


@pytest.mark.parametrize("secret_env", ["ADMIN_PIN", "SECRET_KEY"])
def test_missing_secret_prevents_startup(monkeypatch, secret_env):
    monkeypatch.delenv(secret_env, raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_no_api_key_header_is_401(client):
    res = client.get("/api/pacas/", headers={"X-API-Key": ""})
    assert res.status_code == 401


def test_foreign_keys_prevent_orphan_records():
    async def _insert_orphan():
        async with engine.begin() as conn:
            await conn.execute(text(
                "INSERT INTO venta_items (venta_id, paca_categoria_id, cantidad, precio_unitario, subtotal)"
                " VALUES (999999, 999999, 1, 1, 1)"
            ))

    with pytest.raises(IntegrityError):
        asyncio.run(_insert_orphan())


def test_delete_paca_with_ventas_blocked(client, admin_headers):
    p_res = client.post("/api/pacas/", json={
        "descripcion": "Paca con ventas",
        "costo": 500.0,
        "peso_lbs": 10.0,
        "categorias": [{"nombre": "Camisas", "cantidad_total": 5, "precio_venta": 100.0}],
    }, headers=admin_headers)
    paca_id = p_res.json()["id"]
    cat_id = p_res.json()["categorias"][0]["id"]

    client.post("/api/ventas/", json={"items": [{"paca_categoria_id": cat_id, "cantidad": 1}]})

    del_res = client.delete(f"/api/pacas/{paca_id}", headers=admin_headers)
    assert del_res.status_code == 400
    assert client.get(f"/api/pacas/{paca_id}").json()["id"] == paca_id


def test_concurrent_ventas_no_oversell_stock(client):
    async def _scenario():
        async with async_session() as db:
            paca = await crud.create_paca(db, PacaCreate(
                descripcion="Paca concurrente",
                costo=100.0,
                peso_lbs=5.0,
                categorias=[CategoriaIn(nombre="Única", cantidad_total=1, precio_venta=100.0)],
            ))
        cat_id = paca.categorias[0].id

        async def sell():
            async with async_session() as db:
                await crud.create_venta(db, VentaCreate(
                    items=[VentaItemIn(paca_categoria_id=cat_id, cantidad=1)]
                ))

        results = await asyncio.gather(sell(), sell(), return_exceptions=True)
        ok = [r for r in results if not isinstance(r, Exception)]
        errs = [r for r in results if isinstance(r, Exception)]
        async with engine.connect() as conn:
            stock = (await conn.execute(
                select(PacaCategoria.cantidad_disponible).where(PacaCategoria.id == cat_id)
            )).scalar_one()
        return len(ok), len(errs), stock

    succeeded, failed, stock = asyncio.run(_scenario())
    assert succeeded == 1
    assert failed == 1
    assert stock == 0