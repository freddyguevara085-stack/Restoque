from datetime import datetime
from pydantic import BaseModel, Field


# --- Paca ---
class CategoriaIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=50)
    cantidad_total: int = Field(ge=1)
    precio_venta: float = Field(gt=0)


class PrendasAdd(BaseModel):
    nombre: str = Field(min_length=1, max_length=50)
    cantidad: int = Field(ge=1)
    precio_venta: float = Field(gt=0)


class PacaCreate(BaseModel):
    descripcion: str = Field(min_length=1, max_length=200)
    costo: float = Field(gt=0)
    peso_lbs: float = Field(gt=0)
    categorias: list[CategoriaIn] = Field(default_factory=list, max_length=50)


class CategoriaOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    nombre: str
    cantidad_total: int
    cantidad_disponible: int
    precio_venta: float


class PacaOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    descripcion: str
    costo: float
    peso_lbs: float
    created_at: datetime
    categorias: list[CategoriaOut]


# --- Venta ---
class VentaItemIn(BaseModel):
    paca_categoria_id: int
    cantidad: int = Field(ge=1, default=1)


class VentaCreate(BaseModel):
    items: list[VentaItemIn] = Field(min_length=1, max_length=50)


class VentaItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    paca_categoria_id: int
    cantidad: int
    precio_unitario: float
    subtotal: float


class VentaOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    total: float
    created_at: datetime
    items: list[VentaItemOut]


# --- Dashboard ---
class DashboardOut(BaseModel):
    ventas_hoy: float
    ventas_semana: float
    ventas_mes: float
    inversion_total: float
    ganancia_neta: float
    total_prendas: int
    prendas_vendidas: int
    prendas_disponibles: int
