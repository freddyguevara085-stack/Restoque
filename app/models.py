from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Float, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Paca(Base):
    __tablename__ = "pacas"
    id: Mapped[int] = mapped_column(primary_key=True)
    descripcion: Mapped[str] = mapped_column(String(200))
    costo: Mapped[Decimal] = mapped_column(Numeric(12, 2))  # total cost in C$
    peso_lbs: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    categorias: Mapped[list["PacaCategoria"]] = relationship(back_populates="paca", cascade="all, delete-orphan", lazy="selectin")


class PacaCategoria(Base):
    __tablename__ = "paca_categorias"
    id: Mapped[int] = mapped_column(primary_key=True)
    paca_id: Mapped[int] = mapped_column(ForeignKey("pacas.id", ondelete="CASCADE"))
    nombre: Mapped[str] = mapped_column(String(50))  # Premium, Regular, Económica
    cantidad_total: Mapped[int] = mapped_column(Integer)
    cantidad_disponible: Mapped[int] = mapped_column(Integer)
    precio_venta: Mapped[Decimal] = mapped_column(Numeric(12, 2))  # sale price per unit
    paca: Mapped["Paca"] = relationship(back_populates="categorias")


class Venta(Base):
    __tablename__ = "ventas"
    id: Mapped[int] = mapped_column(primary_key=True)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    items: Mapped[list["VentaItem"]] = relationship(back_populates="venta", cascade="all, delete-orphan", lazy="selectin")


class VentaItem(Base):
    __tablename__ = "venta_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    venta_id: Mapped[int] = mapped_column(ForeignKey("ventas.id", ondelete="CASCADE"))
    paca_categoria_id: Mapped[int] = mapped_column(ForeignKey("paca_categorias.id"))
    cantidad: Mapped[int] = mapped_column(Integer, default=1)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    venta: Mapped["Venta"] = relationship(back_populates="items")
    categoria: Mapped["PacaCategoria"] = relationship(lazy="selectin")
