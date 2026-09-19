from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_serializer


class OutputModel(BaseModel):
    model_config = {"from_attributes": True}

    @field_serializer("*", when_used="json")
    def serialize_decimal(self, value):
        return float(value) if isinstance(value, Decimal) else value


# --- Paca ---
class CategoriaIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=50)
    cantidad_total: int = Field(ge=1)
    precio_venta: Decimal = Field(gt=0)


class PrendasAdd(BaseModel):
    nombre: str = Field(min_length=1, max_length=50)
    cantidad: int = Field(ge=1)
    precio_venta: Decimal = Field(gt=0)


class PacaCreate(BaseModel):
    descripcion: str = Field(min_length=1, max_length=200)
    costo: Decimal = Field(gt=0)
    peso_lbs: float = Field(gt=0)
    categorias: list[CategoriaIn] = Field(default_factory=list, max_length=50)


class CategoriaOut(OutputModel):
    id: int
    nombre: str
    cantidad_total: int
    cantidad_disponible: int
    precio_venta: Decimal


class PacaOut(OutputModel):
    id: int
    descripcion: str
    costo: Decimal
    peso_lbs: float
    created_at: datetime
    categorias: list[CategoriaOut]
    estado: str = "activa"  # "activa" | "recuperada" | "agotada"
    ingresos_recaudados: Decimal = Decimal("0.00")
    porcentaje_recuperado: float = 0.0



# --- Venta ---
class VentaItemIn(BaseModel):
    paca_categoria_id: int
    cantidad: int = Field(ge=1, default=1)


class VentaCreate(BaseModel):
    items: list[VentaItemIn] = Field(min_length=1, max_length=50)


class VentaItemOut(OutputModel):
    id: int
    paca_categoria_id: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal


class VentaOut(OutputModel):
    id: int
    total: Decimal
    created_at: datetime
    items: list[VentaItemOut]


# --- Dashboard ---
class VentaRecienteOut(OutputModel):
    id: int
    created_at: datetime
    total: Decimal
    items_count: int
    resumen: str


class PacaRoiOut(OutputModel):
    id: int
    descripcion: str
    costo: Decimal
    peso_lbs: float
    ingresos_recaudados: Decimal
    porcentaje_recuperado: float
    ganancia_neta_paca: Decimal
    prendas_totales: int
    prendas_disponibles: int
    prendas_vendidas: int
    estado: str  # "recuperada" | "en_proceso" | "agotada"


class DashboardOut(OutputModel):
    ventas_hoy: Decimal
    ventas_semana: Decimal
    ventas_mes: Decimal
    inversion_total: Decimal
    ganancia_neta: Decimal
    total_prendas: int
    prendas_vendidas: int
    prendas_disponibles: int
    # Métricas comerciales Fase 3.1
    valor_inventario_remanente: Decimal = Decimal("0.00")
    margen_bruto_realizado: Decimal = Decimal("0.00")
    porcentaje_margen_bruto: float = 0.0
    ganancia_proyectada_inventario: Decimal = Decimal("0.00")
    actividad_reciente: list[VentaRecienteOut] = Field(default_factory=list)
    roi_pacas: list[PacaRoiOut] = Field(default_factory=list)

