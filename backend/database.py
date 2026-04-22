# database.py — Toda la lógica de la base de datos SQLite
# La clase Database centraliza TODAS las operaciones con gastos.db

import sqlite3, json
from datetime import datetime, date
from pathlib import Path
from typing import Optional, List, Dict
from models import Movimiento, Ajustes


class Database:
    def __init__(self, db_path: Path):
        self.path = str(db_path)
        self._crear_tablas()
        self._insertar_categorias_default()

    # ── Conexión ──────────────────────────────────────────────────────────────
    def _conectar(self):
        """Abre una conexión a SQLite. row_factory permite acceder a los campos por nombre."""
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    # ── Estructura de la BD ───────────────────────────────────────────────────
    def _crear_tablas(self):
        """Crea las tres tablas si no existen. Se ejecuta al arrancar la app."""
        with self._conectar() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS movimientos (
                    id        INTEGER PRIMARY KEY AUTOINCREMENT,
                    tipo      TEXT NOT NULL CHECK(tipo IN ('gasto','ingreso')),
                    nombre    TEXT NOT NULL,
                    importe   REAL NOT NULL,
                    fecha     TEXT NOT NULL,
                    categoria TEXT NOT NULL,
                    notas     TEXT DEFAULT '',
                    creado_en TEXT DEFAULT (datetime('now'))
                );
                CREATE TABLE IF NOT EXISTS categorias (
                    id     INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT UNIQUE NOT NULL,
                    tipo   TEXT NOT NULL CHECK(tipo IN ('gasto','ingreso','ambos')),
                    icono  TEXT DEFAULT '💰',
                    color  TEXT DEFAULT '#6366f1'
                );
                CREATE TABLE IF NOT EXISTS ajustes (
                    clave TEXT PRIMARY KEY,
                    valor TEXT NOT NULL
                );
            """)

    def _insertar_categorias_default(self):
        """Inserta las categorías predefinidas. INSERT OR IGNORE evita duplicados."""
        cats = [
            ("Alimentación","gasto","🛒","#ef4444"), ("Transporte","gasto","🚗","#f97316"),
            ("Vivienda","gasto","🏠","#eab308"),     ("Salud","gasto","❤️","#ec4899"),
            ("Educación","gasto","📚","#8b5cf6"),    ("Ocio","gasto","🎮","#06b6d4"),
            ("Ropa","gasto","👗","#84cc16"),          ("Tecnología","gasto","💻","#3b82f6"),
            ("Restaurantes","gasto","🍽️","#f59e0b"), ("Suscripciones","gasto","📱","#6366f1"),
            ("Viajes","gasto","✈️","#14b8a6"),        ("Otros gastos","gasto","📦","#94a3b8"),
            ("Salario","ingreso","💼","#22c55e"),     ("Freelance","ingreso","💡","#10b981"),
            ("Inversiones","ingreso","📈","#059669"), ("Alquiler","ingreso","🏘️","#16a34a"),
            ("Otros ingresos","ingreso","💵","#15803d"),
        ]
        with self._conectar() as conn:
            conn.executemany("INSERT OR IGNORE INTO categorias (nombre,tipo,icono,color) VALUES (?,?,?,?)", cats)

    # ── CRUD de movimientos ───────────────────────────────────────────────────
    def insertar_movimiento(self, mov: Movimiento) -> int:
        with self._conectar() as conn:
            cur = conn.execute(
                "INSERT INTO movimientos (tipo,nombre,importe,fecha,categoria,notas) VALUES (?,?,?,?,?,?)",
                (mov.tipo, mov.nombre, mov.importe, mov.fecha, mov.categoria, mov.notas or "")
            )
            return cur.lastrowid  # devuelve el ID del nuevo registro

    def actualizar_movimiento(self, mid: int, mov: Movimiento) -> bool:
        with self._conectar() as conn:
            cur = conn.execute(
                "UPDATE movimientos SET tipo=?,nombre=?,importe=?,fecha=?,categoria=?,notas=? WHERE id=?",
                (mov.tipo, mov.nombre, mov.importe, mov.fecha, mov.categoria, mov.notas or "", mid)
            )
            return cur.rowcount > 0  # True si se modificó algo, False si el ID no existía

    def eliminar_movimiento(self, mid: int) -> bool:
        with self._conectar() as conn:
            return conn.execute("DELETE FROM movimientos WHERE id=?", (mid,)).rowcount > 0

    def get_movimientos(self, tipo=None, categoria=None, fecha_inicio=None,
                        fecha_fin=None, buscar=None, limite=100, offset=0) -> List[Dict]:
        """Construye la query dinámicamente según los filtros que vengan informados."""
        q, p = "SELECT * FROM movimientos WHERE 1=1", []
        if tipo:         q += " AND tipo=?";                        p.append(tipo)
        if categoria:    q += " AND categoria=?";                   p.append(categoria)
        if fecha_inicio: q += " AND fecha>=?";                      p.append(fecha_inicio)
        if fecha_fin:    q += " AND fecha<=?";                      p.append(fecha_fin)
        if buscar:       q += " AND (nombre LIKE ? OR notas LIKE ?)"; p += [f"%{buscar}%"]*2
        q += " ORDER BY fecha DESC, id DESC LIMIT ? OFFSET ?"
        p += [limite, offset]
        with self._conectar() as conn:
            return [dict(r) for r in conn.execute(q, p).fetchall()]

    def count_movimientos(self, tipo=None, categoria=None, fecha_inicio=None,
                          fecha_fin=None, buscar=None) -> int:
        """Mismo filtro que get_movimientos pero solo cuenta (para la paginación)."""
        q, p = "SELECT COUNT(*) FROM movimientos WHERE 1=1", []
        if tipo:         q += " AND tipo=?";                        p.append(tipo)
        if categoria:    q += " AND categoria=?";                   p.append(categoria)
        if fecha_inicio: q += " AND fecha>=?";                      p.append(fecha_inicio)
        if fecha_fin:    q += " AND fecha<=?";                      p.append(fecha_fin)
        if buscar:       q += " AND (nombre LIKE ? OR notas LIKE ?)"; p += [f"%{buscar}%"]*2
        with self._conectar() as conn:
            return conn.execute(q, p).fetchone()[0]

    # ── Dashboard ─────────────────────────────────────────────────────────────
    def get_resumen_dashboard(self) -> Dict:
        """Calcula el resumen del mes: saldo, variaciones y últimas transacciones."""
        with self._conectar() as conn:
            hoy     = date.today()
            mes_act = hoy.strftime("%Y-%m")
            mes_ant = date(hoy.year if hoy.month > 1 else hoy.year-1,
                           hoy.month-1 if hoy.month > 1 else 12, 1).strftime("%Y-%m")

            def suma(tipo, mes):
                return round(conn.execute(
                    "SELECT COALESCE(SUM(importe),0) FROM movimientos WHERE tipo=? AND strftime('%Y-%m',fecha)=?",
                    (tipo, mes)
                ).fetchone()[0], 2)

            gm, im = suma("gasto", mes_act), suma("ingreso", mes_act)
            ga, ia = suma("gasto", mes_ant), suma("ingreso", mes_ant)

            total_g = conn.execute("SELECT COALESCE(SUM(importe),0) FROM movimientos WHERE tipo='gasto'").fetchone()[0]
            total_i = conn.execute("SELECT COALESCE(SUM(importe),0) FROM movimientos WHERE tipo='ingreso'").fetchone()[0]
            total_n = conn.execute("SELECT COUNT(*) FROM movimientos").fetchone()[0]
            ultimas = conn.execute("SELECT * FROM movimientos ORDER BY fecha DESC, id DESC LIMIT 5").fetchall()

            return {
                "saldo_total":          round(total_i - total_g, 2),
                "total_gastos":         round(total_g, 2),
                "total_ingresos":       round(total_i, 2),
                "total_movimientos":    total_n,
                "gastos_mes_actual":    gm,
                "ingresos_mes_actual":  im,
                "gastos_mes_anterior":  ga,
                "ingresos_mes_anterior":ia,
                "variacion_gastos":     round((gm-ga)/ga*100 if ga > 0 else 0, 1),
                "variacion_ingresos":   round((im-ia)/ia*100 if ia > 0 else 0, 1),
                "ultimas_transacciones":[dict(r) for r in ultimas],
                "mes_actual":           mes_act,
            }

    def get_tendencia_mensual(self, meses: int = 6) -> List[Dict]:
        """Gastos e ingresos agrupados por mes (para el gráfico de barras)."""
        with self._conectar() as conn:
            rows = conn.execute(f"""
                SELECT strftime('%Y-%m', fecha) AS mes,
                       SUM(CASE WHEN tipo='ingreso' THEN importe ELSE 0 END) AS ingresos,
                       SUM(CASE WHEN tipo='gasto'   THEN importe ELSE 0 END) AS gastos
                FROM movimientos
                GROUP BY mes ORDER BY mes DESC LIMIT {meses}
            """).fetchall()
            return [dict(r) for r in reversed(rows)]  # orden cronológico

    def get_resumen_categorias(self) -> List[Dict]:
        """Gastos e ingresos del mes actual agrupados por categoría (para el gráfico de dona)."""
        mes = date.today().strftime("%Y-%m")
        with self._conectar() as conn:
            rows = conn.execute("""
                SELECT categoria, tipo, SUM(importe) AS total, COUNT(*) AS cantidad
                FROM movimientos WHERE strftime('%Y-%m', fecha)=?
                GROUP BY categoria, tipo ORDER BY total DESC
            """, (mes,)).fetchall()
            return [dict(r) for r in rows]

    # ── Análisis ──────────────────────────────────────────────────────────────
    def get_analisis_completo(self) -> Dict:
        """Métricas avanzadas: promedio diario, top categorías, evolución anual..."""
        DIAS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"]
        with self._conectar() as conn:
            # Promedio diario = total gastado en 30 días / 30 (así los días sin gasto cuentan como 0)
            avg = conn.execute("""
                SELECT COALESCE(SUM(importe),0)/30.0 FROM movimientos
                WHERE tipo='gasto' AND fecha >= date('now','-30 days')
            """).fetchone()[0]

            top_g = conn.execute("""
                SELECT categoria, SUM(importe) AS total, COUNT(*) AS veces
                FROM movimientos WHERE tipo='gasto'
                GROUP BY categoria ORDER BY total DESC LIMIT 5
            """).fetchall()

            top_i = conn.execute("""
                SELECT categoria, SUM(importe) AS total, COUNT(*) AS veces
                FROM movimientos WHERE tipo='ingreso'
                GROUP BY categoria ORDER BY total DESC LIMIT 5
            """).fetchall()

            dia = conn.execute("""
                SELECT strftime('%w', fecha) AS d, SUM(importe) AS total
                FROM movimientos WHERE tipo='gasto'
                GROUP BY d ORDER BY total DESC LIMIT 1
            """).fetchone()

            anual = conn.execute("""
                SELECT strftime('%Y-%m', fecha) AS mes,
                       SUM(CASE WHEN tipo='ingreso' THEN importe ELSE 0 END) AS ingresos,
                       SUM(CASE WHEN tipo='gasto'   THEN importe ELSE 0 END) AS gastos,
                       SUM(CASE WHEN tipo='ingreso' THEN importe ELSE -importe END) AS neto
                FROM movimientos WHERE fecha >= date('now','-12 months')
                GROUP BY mes ORDER BY mes
            """).fetchall()

            dist = conn.execute("""
                SELECT categoria, SUM(importe) AS total
                FROM movimientos WHERE tipo='gasto'
                GROUP BY categoria ORDER BY total DESC
            """).fetchall()

            return {
                "gasto_promedio_diario":    round(avg, 2),
                "top_categorias_gasto":     [dict(r) for r in top_g],
                "top_categorias_ingreso":   [dict(r) for r in top_i],
                "dia_mayor_gasto":          DIAS[int(dia[0])] if dia else "N/D",
                "evolucion_anual":          [dict(r) for r in anual],
                "distribucion_categorias":  [dict(r) for r in dist],
            }

    # ── Categorías ────────────────────────────────────────────────────────────
    def get_categorias(self) -> List[Dict]:
        with self._conectar() as conn:
            return [dict(r) for r in conn.execute("SELECT * FROM categorias ORDER BY tipo, nombre").fetchall()]

    # ── Ajustes (clave-valor) ─────────────────────────────────────────────────
    def get_ajustes(self) -> Dict:
        with self._conectar() as conn:
            result = {}
            for r in conn.execute("SELECT clave, valor FROM ajustes").fetchall():
                try:    result[r["clave"]] = json.loads(r["valor"])
                except: result[r["clave"]] = r["valor"]
            return result

    def guardar_ajustes(self, ajustes: Ajustes):
        """Guarda cada campo como clave-valor. INSERT OR REPLACE = upsert."""
        with self._conectar() as conn:
            for clave, valor in ajustes.model_dump(exclude_none=True).items():
                conn.execute("INSERT OR REPLACE INTO ajustes (clave,valor) VALUES (?,?)",
                             (clave, json.dumps(valor)))

    # ── Exportar / Importar / Borrar ──────────────────────────────────────────
    def exportar_todo(self) -> Dict:
        with self._conectar() as conn:
            movs = [dict(r) for r in conn.execute("SELECT * FROM movimientos ORDER BY fecha").fetchall()]
            return {"version": "1.0", "exportado_en": datetime.now().isoformat(),
                    "movimientos": movs, "ajustes": self.get_ajustes()}

    def importar_todo(self, datos: Dict) -> int:
        movs = datos.get("movimientos", [])
        with self._conectar() as conn:
            conn.executemany("""
                INSERT OR IGNORE INTO movimientos (tipo,nombre,importe,fecha,categoria,notas,creado_en)
                VALUES (:tipo,:nombre,:importe,:fecha,:categoria,:notas,:creado_en)
            """, [{**m, "notas": m.get("notas",""), "creado_en": m.get("creado_en", datetime.now().isoformat())} for m in movs])
        return len(movs)

    def borrar_todo(self):
        with self._conectar() as conn:
            conn.execute("DELETE FROM movimientos")
