from datetime import datetime

from fastapi import APIRouter, HTTPException, status

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
