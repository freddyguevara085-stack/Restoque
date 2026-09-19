from io import BytesIO
from decimal import Decimal

import openpyxl
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.auth import require_admin
from app.database import DB
from app.schemas import DashboardOut
from app import crud

router = APIRouter(prefix="/reportes", tags=["Reportes"])


def sanitize_excel_cell(val):
    if isinstance(val, str) and val.startswith(("=", "+", "-", "@")):
        return "'" + val
    return val


@router.get("/dashboard", response_model=DashboardOut, dependencies=[Depends(require_admin)])
async def get_dashboard(db: DB):
    return await crud.get_dashboard(db)


@router.get("/excel", dependencies=[Depends(require_admin)])
async def download_excel(db: DB):
    ventas = await crud.get_ventas(db, None, None)
    pacas = await crud.get_pacas(db)

    wb = openpyxl.Workbook()

    # Sheet 1: Ventas detalladas
    ws = wb.active
    ws.title = "Ventas"
    ws.append(["ID Venta", "Fecha", "Categoría", "Cantidad", "Precio Unitario", "Subtotal", "Total Venta"])
    for venta in ventas:
        for item in venta.items:
            cat_nombre = item.categoria.nombre if item.categoria else "Desconocida"
            ws.append([
                venta.id,
                venta.created_at.strftime("%Y-%m-%d %H:%M") if venta.created_at else "",
                sanitize_excel_cell(cat_nombre),
                item.cantidad,
                item.precio_unitario,
                item.subtotal,
                venta.total,
            ])

    # Sheet 2: Resumen por Paca
    ws2 = wb.create_sheet(title="Resumen por Paca")
    ws2.append(["Paca", "Costo", "Total Prendas", "Vendidas", "Disponibles", "Ingresos", "Ganancia"])

    # Pre-index venta items by categoria id
    ingresos_por_cat: dict[int, Decimal] = {}
    for venta in ventas:
        for item in venta.items:
            ingresos_por_cat[item.paca_categoria_id] = (
                ingresos_por_cat.get(item.paca_categoria_id, Decimal("0.00")) + item.subtotal
            )

    for paca in pacas:
        total_prendas = sum(c.cantidad_total for c in paca.categorias)
        disponibles = sum(c.cantidad_disponible for c in paca.categorias)
        ingresos = sum(ingresos_por_cat.get(c.id, 0.0) for c in paca.categorias)
        ws2.append([
            sanitize_excel_cell(paca.descripcion),
            paca.costo,
            total_prendas,
            total_prendas - disponibles,
            disponibles,
            ingresos,
            ingresos - paca.costo,
        ])

    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=restoque_reporte.xlsx"},
    )
