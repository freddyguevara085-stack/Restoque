from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import require_admin
from app.database import DB
from app.schemas import PacaCreate, PacaOut, PrendasAdd
from app import crud

router = APIRouter(prefix="/pacas", tags=["Pacas"])


@router.get("/", response_model=list[PacaOut])
async def list_pacas(db: DB):
    return await crud.get_pacas(db)


@router.get("/{paca_id}", response_model=PacaOut)
async def get_paca(paca_id: int, db: DB):
    paca = await crud.get_paca(db, paca_id)
    if not paca:
        raise HTTPException(status_code=404, detail="Paca no encontrada")
    return paca


@router.post("/", response_model=PacaOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
async def create_paca(payload: PacaCreate, db: DB):
    return await crud.create_paca(db, payload)


@router.post("/{paca_id}/prendas", response_model=PacaOut, dependencies=[Depends(require_admin)])
async def add_prendas(paca_id: int, payload: PrendasAdd, db: DB):
    paca = await crud.add_prendas_a_paca(db, paca_id, payload)
    if not paca:
        raise HTTPException(status_code=404, detail="Paca no encontrada")
    return paca


@router.delete("/{paca_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_paca(paca_id: int, db: DB):
    try:
        if not await crud.delete_paca(db, paca_id):
            raise HTTPException(status_code=404, detail="Paca no encontrada")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
