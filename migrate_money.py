"""One-time migration: convert money columns from FLOAT to NUMERIC(12,2).

Backs up nothing itself; run with a copy of restoque.db. Idempotent-ish:
if pacas already uses NUMERIC, it still runs harmlessly. Uses temp tables so
a failure keeps the original tables intact; only drops originals at the end.
"""
import re
import sqlite3
import shutil
import sys
import time

DB = "restoque.db"

NEW_TABLES = {
    "pacas": (
        "CREATE TABLE pacas ("
        " id INTEGER NOT NULL, descripcion VARCHAR(200) NOT NULL,"
        " costo NUMERIC(12,2) NOT NULL, peso_lbs FLOAT NOT NULL,"
        " created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,"
        " PRIMARY KEY (id))"
    ),
    "paca_categorias": (
        "CREATE TABLE paca_categorias ("
        " id INTEGER NOT NULL, paca_id INTEGER NOT NULL, nombre VARCHAR(50) NOT NULL,"
        " cantidad_total INTEGER NOT NULL, cantidad_disponible INTEGER NOT NULL,"
        " precio_venta NUMERIC(12,2) NOT NULL,"
        " PRIMARY KEY (id),"
        " FOREIGN KEY(paca_id) REFERENCES pacas (id) ON DELETE CASCADE)"
    ),
    "ventas": (
        "CREATE TABLE ventas ("
        " id INTEGER NOT NULL, total NUMERIC(12,2) NOT NULL,"
        " created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,"
        " PRIMARY KEY (id))"
    ),
    "venta_items": (
        "CREATE TABLE venta_items ("
        " id INTEGER NOT NULL, venta_id INTEGER NOT NULL, paca_categoria_id INTEGER NOT NULL,"
        " cantidad INTEGER NOT NULL, precio_unitario NUMERIC(12,2) NOT NULL,"
        " subtotal NUMERIC(12,2) NOT NULL,"
        " PRIMARY KEY (id),"
        " FOREIGN KEY(venta_id) REFERENCES ventas (id) ON DELETE CASCADE,"
        " FOREIGN KEY(paca_categoria_id) REFERENCES paca_categorias (id))"
    ),
}

COLS = {
    "pacas": ["id", "descripcion", "costo", "peso_lbs", "created_at"],
    "paca_categorias": ["id", "paca_id", "nombre", "cantidad_total", "cantidad_disponible", "precio_venta"],
    "ventas": ["id", "total", "created_at"],
    "venta_items": ["id", "venta_id", "paca_categoria_id", "cantidad", "precio_unitario", "subtotal"],
}


def main() -> None:
    if len(sys.argv) > 1:
        db = sys.argv[1]
    else:
        db = DB
    backup = f"{db}.bak-{int(time.time())}"
    shutil.copyfile(db, backup)
    print(f"Copia de seguridad en {backup}")

    con = sqlite3.connect(db)
    con.execute("PRAGMA foreign_keys=OFF")
    try:
        con.execute("BEGIN")
        for name, ddl in NEW_TABLES.items():
            tmp = f"_{name}_new"
            con.execute(f"DROP TABLE IF EXISTS {tmp}")
            con.execute(re.sub(r"\b" + name + r"\b", tmp, ddl, count=1))
            cols = ", ".join(COLS[name])
            con.execute(f"INSERT INTO {tmp} ({cols}) SELECT {cols} FROM {name}")
        for name in ["venta_items", "paca_categorias", "ventas", "pacas"]:
            con.execute(f"DROP TABLE {name}")
        for name in NEW_TABLES:
            con.execute(f"ALTER TABLE _{name}_new RENAME TO {name}")
        con.execute("COMMIT")
    except Exception:
        con.execute("ROLLBACK")
        raise
    finally:
        con.execute("PRAGMA foreign_keys=ON")
        con.close()
    print("Migración a NUMERIC(12,2) completada.")


if __name__ == "__main__":
    main()