from datetime import datetime

from app.auth import require_admin
from fastapi import APIRouter, HTTPException, status, Depends

from app.database import DB
from app.schemas import VentaCreate, VentaOut
from app import crud

router = APIRouter(prefix="/ventas", tags=["Ventas"])


@router.post("/", response_model=VentaOut, status_code=status.HTTP_201_CREATED)
async def create_venta(payload: VentaCreate, db: DB):
    try:
        return await crud.create_venta(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[VentaOut])
async def list_ventas(
    db: DB,
    desde: datetime | None = None,
    hasta: datetime | None = None,
):
    return await crud.get_ventas(db, desde, hasta)


@router.delete("/{venta_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_venta(venta_id: int, db: DB):
    success = await crud.delete_venta(db, venta_id)
    if not success:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
