from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select, update, func as sql_func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Paca, PacaCategoria, Venta, VentaItem
from app.schemas import PacaCreate, VentaCreate, PrendasAdd

MONEY_ZERO = Decimal("0.00")


def _money(value) -> Decimal:
    return Decimal(str(value or "0")).quantize(Decimal("0.01"))


def _enrich_paca(paca: Paca, ingresos_por_cat: dict[int, Decimal]) -> Paca:
    disp_paca = sum(c.cantidad_disponible for c in paca.categorias)
    tot_paca = sum(c.cantidad_total for c in paca.categorias)
    ingresos_paca = sum((ingresos_por_cat.get(c.id, MONEY_ZERO) for c in paca.categorias), MONEY_ZERO)
    pct = float(ingresos_paca / paca.costo * 100) if paca.costo > 0 else 100.0

    if paca.costo > 0 and ingresos_paca >= paca.costo:
        paca.estado = "recuperada"
    elif disp_paca == 0 and tot_paca > 0:
        paca.estado = "agotada"
    else:
        paca.estado = "activa"

    paca.ingresos_recaudados = _money(ingresos_paca)
    paca.porcentaje_recuperado = round(pct, 1)
    return paca


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
    return _enrich_paca(paca, {})


async def get_pacas(db: AsyncSession) -> list[Paca]:
    result = await db.execute(select(Paca).options(selectinload(Paca.categorias)))
    pacas = list(result.scalars().all())

    r_cat = await db.execute(
        select(
            VentaItem.paca_categoria_id,
            sql_func.coalesce(sql_func.sum(VentaItem.subtotal), 0)
        ).group_by(VentaItem.paca_categoria_id)
    )
    ingresos_por_cat = {row[0]: _money(row[1]) for row in r_cat.all()}

    for p in pacas:
        _enrich_paca(p, ingresos_por_cat)

    return pacas


async def get_paca(db: AsyncSession, paca_id: int) -> Paca | None:
    result = await db.execute(select(Paca).options(selectinload(Paca.categorias)).where(Paca.id == paca_id))
    paca = result.scalar_one_or_none()
    if not paca:
        return None

    cat_ids = [c.id for c in paca.categorias]
    ingresos_por_cat: dict[int, Decimal] = {}
    if cat_ids:
        r_cat = await db.execute(
            select(
                VentaItem.paca_categoria_id,
                sql_func.coalesce(sql_func.sum(VentaItem.subtotal), 0)
            )
            .where(VentaItem.paca_categoria_id.in_(cat_ids))
            .group_by(VentaItem.paca_categoria_id)
        )
        ingresos_por_cat = {row[0]: _money(row[1]) for row in r_cat.all()}

    return _enrich_paca(paca, ingresos_por_cat)


async def add_prendas_a_paca(
    db: AsyncSession, paca_id: int, payload: PrendasAdd
) -> Paca | None:
    paca = await get_paca(db, paca_id)
    if not paca:
        return None

    cat_nombre = payload.nombre.strip()
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
    return await get_paca(db, paca_id)


async def delete_paca(db: AsyncSession, paca_id: int) -> bool:
    paca = await get_paca(db, paca_id)
    if not paca:
        return False
    if paca.ingresos_recaudados > 0:
        raise ValueError("No se puede eliminar una paca que ya tiene ventas registradas.")
    await db.delete(paca)
    await db.commit()
    return True


async def create_venta(db: AsyncSession, payload: VentaCreate) -> Venta:
    cat_ids = [item.paca_categoria_id for item in payload.items]
    res = await db.execute(select(PacaCategoria).where(PacaCategoria.id.in_(cat_ids)))
    cats_by_id = {c.id: c for c in res.scalars().all()}

    venta = Venta(total=MONEY_ZERO)
    total_venta = MONEY_ZERO

    try:
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
    except ValueError:
        await db.rollback()
        raise


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


async def delete_venta(db: AsyncSession, venta_id: int) -> bool:
    venta = await db.execute(select(Venta).options(selectinload(Venta.items)).where(Venta.id == venta_id))
    venta = venta.scalar_one_or_none()
    if not venta:
        return False
    for item in venta.items:
        await db.execute(
            update(PacaCategoria)
            .where(PacaCategoria.id == item.paca_categoria_id)
            .values(cantidad_disponible=PacaCategoria.cantidad_disponible + item.cantidad)
        )
    await db.delete(venta)
    await db.commit()
    return True


async def get_dashboard(db: AsyncSession) -> dict:
    tz = timezone(timedelta(hours=-6))
    now = datetime.now(tz)
    start_today_local = datetime(now.year, now.month, now.day, tzinfo=tz)
    start_today = start_today_local.astimezone(timezone.utc).replace(tzinfo=None)
    start_week = start_today - timedelta(days=7)
    start_month = start_today - timedelta(days=30)

    # 1. Ventas por período
    r = await db.execute(
        select(sql_func.coalesce(sql_func.sum(Venta.total), 0))
        .where(Venta.created_at >= start_today)
    )
    ventas_hoy = _money(r.scalar())

    r = await db.execute(
        select(sql_func.coalesce(sql_func.sum(Venta.total), 0))
        .where(Venta.created_at >= start_week)
    )
    ventas_semana = _money(r.scalar())

    r = await db.execute(
        select(sql_func.coalesce(sql_func.sum(Venta.total), 0))
        .where(Venta.created_at >= start_month)
    )
    ventas_mes = _money(r.scalar())

    r = await db.execute(select(sql_func.coalesce(sql_func.sum(Venta.total), 0)))
    total_revenue = _money(r.scalar())

    # 2. Pacas con categorías
    res_pacas = await db.execute(select(Paca).options(selectinload(Paca.categorias)))
    pacas = list(res_pacas.scalars().all())
    inversion_total = sum((p.costo for p in pacas), MONEY_ZERO)

    # Flujo de caja neto
    ganancia_neta = total_revenue - inversion_total

    # 3. Ingresos recaudados agrupados por paca_categoria_id
    r_cat_ingresos = await db.execute(
        select(
            VentaItem.paca_categoria_id,
            sql_func.coalesce(sql_func.sum(VentaItem.subtotal), 0)
        ).group_by(VentaItem.paca_categoria_id)
    )
    ingresos_por_cat = {row[0]: _money(row[1]) for row in r_cat_ingresos.all()}

    # 4. Métricas comerciales y de ROI por Paca
    total_prendas = 0
    prendas_disponibles = 0
    total_costo_vendido = MONEY_ZERO
    valor_inventario_remanente = MONEY_ZERO
    costo_inventario_remanente = MONEY_ZERO
    roi_pacas = []

    for p in pacas:
        tot_paca = sum(c.cantidad_total for c in p.categorias)
        disp_paca = sum(c.cantidad_disponible for c in p.categorias)
        vend_paca = tot_paca - disp_paca
        total_prendas += tot_paca
        prendas_disponibles += disp_paca

        c_unit = (p.costo / tot_paca) if tot_paca > 0 else MONEY_ZERO
        ingresos_paca = sum((ingresos_por_cat.get(c.id, MONEY_ZERO) for c in p.categorias), MONEY_ZERO)
        pct_recuperado = float(ingresos_paca / p.costo * 100) if p.costo > 0 else 100.0

        for c in p.categorias:
            vend_cat = c.cantidad_total - c.cantidad_disponible
            total_costo_vendido += vend_cat * c_unit
            valor_inventario_remanente += c.cantidad_disponible * c.precio_venta
            costo_inventario_remanente += c.cantidad_disponible * c_unit

        if p.costo > 0 and ingresos_paca >= p.costo:
            estado = "recuperada"
        elif disp_paca == 0 and tot_paca > 0:
            estado = "agotada"
        else:
            estado = "en_proceso"

        roi_pacas.append({
            "id": p.id,
            "descripcion": p.descripcion,
            "costo": _money(p.costo),
            "peso_lbs": round(p.peso_lbs, 1),
            "ingresos_recaudados": _money(ingresos_paca),
            "porcentaje_recuperado": round(pct_recuperado, 1),
            "ganancia_neta_paca": _money(ingresos_paca - p.costo),
            "prendas_totales": tot_paca,
            "prendas_disponibles": disp_paca,
            "prendas_vendidas": vend_paca,
            "estado": estado,
        })

    # Margen bruto de lo vendido (ingresos menos costo proporcional)
    margen_bruto_realizado = _money(total_revenue - total_costo_vendido)
    porcentaje_margen_bruto = round(float(margen_bruto_realizado / total_revenue * 100), 1) if total_revenue > 0 else 0.0
    ganancia_proyectada_inventario = _money(valor_inventario_remanente - costo_inventario_remanente)

    # 5. Actividad reciente (últimas 5 ventas)
    r_rec = await db.execute(
        select(Venta)
        .options(selectinload(Venta.items).selectinload(VentaItem.categoria))
        .order_by(Venta.created_at.desc())
        .limit(5)
    )
    recent_ventas = r_rec.scalars().all()

    actividad_reciente = []
    for v in recent_ventas:
        items_count = sum(it.cantidad for it in v.items)
        parts = [f"{it.cantidad}x {it.categoria.nombre if it.categoria else 'Prenda'}" for it in v.items]
        resumen = ", ".join(parts) if parts else "Sin prendas"
        actividad_reciente.append({
            "id": v.id,
            "created_at": v.created_at,
            "total": _money(v.total),
            "items_count": items_count,
            "resumen": resumen,
        })

    return {
        "ventas_hoy": _money(ventas_hoy),
        "ventas_semana": _money(ventas_semana),
        "ventas_mes": _money(ventas_mes),
        "inversion_total": _money(inversion_total),
        "ganancia_neta": _money(ganancia_neta),
        "total_prendas": total_prendas,
        "prendas_vendidas": total_prendas - prendas_disponibles,
        "prendas_disponibles": prendas_disponibles,
        # Nuevos campos comerciales
        "valor_inventario_remanente": _money(valor_inventario_remanente),
        "margen_bruto_realizado": margen_bruto_realizado,
        "porcentaje_margen_bruto": porcentaje_margen_bruto,
        "ganancia_proyectada_inventario": ganancia_proyectada_inventario,
        "actividad_reciente": actividad_reciente,
        "roi_pacas": roi_pacas,
    }
