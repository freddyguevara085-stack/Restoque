from datetime import datetime, timedelta, date, timezone

from sqlalchemy import select, update, func as sql_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Paca, PacaCategoria, Venta, VentaItem
from app.schemas import PacaCreate, VentaCreate, PrendasAdd


async def create_paca(db: AsyncSession, payload: PacaCreate) -> Paca:
    paca = Paca(
        descripcion=payload.descripcion,
        costo=payload.costo,
        peso_lbs=payload.peso_lbs,
    )
    for cat in payload.categorias:
        paca.categorias.append(PacaCategoria(
            nombre=cat.nombre,
            cantidad_total=cat.cantidad_total,
            cantidad_disponible=cat.cantidad_total,
            precio_venta=cat.precio_venta,
        ))
    db.add(paca)
    await db.commit()
    await db.refresh(paca)
    return paca


async def get_pacas(db: AsyncSession) -> list[Paca]:
    result = await db.execute(select(Paca))
    return list(result.scalars().all())


async def get_paca(db: AsyncSession, paca_id: int) -> Paca | None:
    result = await db.execute(select(Paca).where(Paca.id == paca_id))
    return result.scalar_one_or_none()


async def add_prendas_a_paca(
    db: AsyncSession, paca_id: int, payload: PrendasAdd
) -> Paca | None:
    paca = await get_paca(db, paca_id)
    if not paca:
        return None

    cat_nombre = payload.nombre.strip()
    # Buscar si ya existe una categoría con el mismo nombre y precio
    categoria = next(
        (
            c for c in paca.categorias
            if c.nombre.strip().lower() == cat_nombre.lower() and c.precio_venta == payload.precio_venta
        ),
        None
    )

    if categoria:
        categoria.cantidad_total += payload.cantidad
        categoria.cantidad_disponible += payload.cantidad
    else:
        paca.categorias.append(PacaCategoria(
            nombre=cat_nombre,
            cantidad_total=payload.cantidad,
            cantidad_disponible=payload.cantidad,
            precio_venta=payload.precio_venta,
        ))

    await db.commit()
    await db.refresh(paca)
    return paca


async def delete_paca(db: AsyncSession, paca_id: int) -> bool:
    paca = await get_paca(db, paca_id)
    if not paca:
        return False
    await db.delete(paca)
    await db.commit()
    return True


async def create_venta(db: AsyncSession, payload: VentaCreate) -> Venta:
    cat_ids = [item.paca_categoria_id for item in payload.items]
    res = await db.execute(select(PacaCategoria).where(PacaCategoria.id.in_(cat_ids)))
    cats_by_id = {c.id: c for c in res.scalars().all()}

    venta = Venta(total=0.0)
    total_venta = 0.0

    for item_in in payload.items:
        cat = cats_by_id.get(item_in.paca_categoria_id)
        if not cat:
            raise ValueError(f"Categoría #{item_in.paca_categoria_id} no encontrada.")

        # Atomic conditional decrement: only update if cantidad_disponible >= requested
        stmt = (
            update(PacaCategoria)
            .where(
                PacaCategoria.id == item_in.paca_categoria_id,
                PacaCategoria.cantidad_disponible >= item_in.cantidad,
            )
            .values(cantidad_disponible=PacaCategoria.cantidad_disponible - item_in.cantidad)
        )
        upd_result = await db.execute(stmt)

        if upd_result.rowcount == 0:
            raise ValueError(
                f"Stock insuficiente para {cat.nombre}. "
                f"Disponible: {cat.cantidad_disponible}, solicitado: {item_in.cantidad}."
            )

        subtotal = item_in.cantidad * cat.precio_venta
        total_venta += subtotal

        venta.items.append(VentaItem(
            paca_categoria_id=cat.id,
            cantidad=item_in.cantidad,
            precio_unitario=cat.precio_venta,
            subtotal=subtotal,
        ))

    venta.total = total_venta
    db.add(venta)
    await db.commit()
    await db.refresh(venta)
    return venta


async def get_ventas(
    db: AsyncSession, desde: datetime | None, hasta: datetime | None
) -> list[Venta]:
    query = select(Venta).order_by(Venta.created_at.desc())
    if desde:
        query = query.where(Venta.created_at >= desde)
    if hasta:
        query = query.where(Venta.created_at <= hasta)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_dashboard(db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start_today = datetime(now.year, now.month, now.day)
    start_week = start_today - timedelta(days=7)
    start_month = start_today - timedelta(days=30)

    r = await db.execute(
        select(sql_func.coalesce(sql_func.sum(Venta.total), 0.0))
        .where(Venta.created_at >= start_today)
    )
    ventas_hoy = r.scalar()

    r = await db.execute(
        select(sql_func.coalesce(sql_func.sum(Venta.total), 0.0))
        .where(Venta.created_at >= start_week)
    )
    ventas_semana = r.scalar()

    r = await db.execute(
        select(sql_func.coalesce(sql_func.sum(Venta.total), 0.0))
        .where(Venta.created_at >= start_month)
    )
    ventas_mes = r.scalar()

    r = await db.execute(select(sql_func.coalesce(sql_func.sum(Paca.costo), 0.0)))
    inversion_total = r.scalar()

    r = await db.execute(select(sql_func.coalesce(sql_func.sum(Venta.total), 0.0)))
    total_revenue = r.scalar()

    ganancia_neta = total_revenue - inversion_total

    result = await db.execute(select(PacaCategoria))
    categorias = result.scalars().all()
    total_prendas = sum(c.cantidad_total for c in categorias)
    prendas_disponibles = sum(c.cantidad_disponible for c in categorias)

    return {
        "ventas_hoy": ventas_hoy,
        "ventas_semana": ventas_semana,
        "ventas_mes": ventas_mes,
        "inversion_total": inversion_total,
        "ganancia_neta": ganancia_neta,
        "total_prendas": total_prendas,
        "prendas_vendidas": total_prendas - prendas_disponibles,
        "prendas_disponibles": prendas_disponibles,
    }
