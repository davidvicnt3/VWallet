"""
Módulo de base de datos - SQLite
Gestiona todas las operaciones de datos de la aplicación.
"""

import sqlite3
import json
from datetime import datetime, date
from pathlib import Path
from typing import Optional, List, Dict, Any
from models import Movimiento, Ajustes


class Database:
    def __init__(self, db_path: Path):
        self.db_path = str(db_path)
        self._crear_tablas()
        self._insertar_categorias_default()

    def _conectar(self):
        """Crear conexión con row_factory para obtener dicts."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _crear_tablas(self):
        """Crear estructura de la base de datos."""
        with self._conectar() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS movimientos (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    tipo        TEXT NOT NULL CHECK(tipo IN ('gasto','ingreso')),
                    nombre      TEXT NOT NULL,
                    importe     REAL NOT NULL,
                    fecha       TEXT NOT NULL,
                    categoria   TEXT NOT NULL,
                    notas       TEXT DEFAULT '',
                    creado_en   TEXT DEFAULT (datetime('now'))
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
        """Insertar categorías predeterminadas si no existen."""
        categorias = [
            # Gastos
            ("Alimentación",    "gasto",   "🛒", "#ef4444"),
            ("Transporte",      "gasto",   "🚗", "#f97316"),
            ("Vivienda",        "gasto",   "🏠", "#eab308"),
            ("Salud",           "gasto",   "❤️", "#ec4899"),
            ("Educación",       "gasto",   "📚", "#8b5cf6"),
            ("Ocio",            "gasto",   "🎮", "#06b6d4"),
            ("Ropa",            "gasto",   "👗", "#84cc16"),
            ("Tecnología",      "gasto",   "💻", "#3b82f6"),
            ("Restaurantes",    "gasto",   "🍽️", "#f59e0b"),
            ("Suscripciones",   "gasto",   "📱", "#6366f1"),
            ("Viajes",          "gasto",   "✈️", "#14b8a6"),
            ("Otros gastos",    "gasto",   "📦", "#94a3b8"),
            # Ingresos
            ("Salario",         "ingreso", "💼", "#22c55e"),
            ("Freelance",       "ingreso", "💡", "#10b981"),
            ("Inversiones",     "ingreso", "📈", "#059669"),
            ("Alquiler",        "ingreso", "🏘️", "#16a34a"),
            ("Otros ingresos",  "ingreso", "💵", "#15803d"),
        ]
        with self._conectar() as conn:
            for cat in categorias:
                conn.execute(
                    "INSERT OR IGNORE INTO categorias (nombre, tipo, icono, color) VALUES (?,?,?,?)",
                    cat
                )

    # ─── Movimientos ──────────────────────────────────────────────────────────
    def insertar_movimiento(self, mov: Movimiento) -> int:
        with self._conectar() as conn:
            cursor = conn.execute(
                "INSERT INTO movimientos (tipo, nombre, importe, fecha, categoria, notas) VALUES (?,?,?,?,?,?)",
                (mov.tipo, mov.nombre, mov.importe, mov.fecha, mov.categoria, mov.notas or "")
            )
            return cursor.lastrowid

    def actualizar_movimiento(self, mov_id: int, mov: Movimiento) -> bool:
        with self._conectar() as conn:
            cursor = conn.execute(
                "UPDATE movimientos SET tipo=?, nombre=?, importe=?, fecha=?, categoria=?, notas=? WHERE id=?",
                (mov.tipo, mov.nombre, mov.importe, mov.fecha, mov.categoria, mov.notas or "", mov_id)
            )
            return cursor.rowcount > 0

    def eliminar_movimiento(self, mov_id: int) -> bool:
        with self._conectar() as conn:
            cursor = conn.execute("DELETE FROM movimientos WHERE id=?", (mov_id,))
            return cursor.rowcount > 0

    def get_movimientos(
        self,
        tipo: Optional[str] = None,
        categoria: Optional[str] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        buscar: Optional[str] = None,
        limite: int = 100,
        offset: int = 0,
    ) -> List[Dict]:
        query = "SELECT * FROM movimientos WHERE 1=1"
        params = []
        if tipo:
            query += " AND tipo = ?"
            params.append(tipo)
        if categoria:
            query += " AND categoria = ?"
            params.append(categoria)
        if fecha_inicio:
            query += " AND fecha >= ?"
            params.append(fecha_inicio)
        if fecha_fin:
            query += " AND fecha <= ?"
            params.append(fecha_fin)
        if buscar:
            query += " AND (nombre LIKE ? OR notas LIKE ?)"
            params += [f"%{buscar}%", f"%{buscar}%"]
        query += " ORDER BY fecha DESC, id DESC LIMIT ? OFFSET ?"
        params += [limite, offset]

        with self._conectar() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(r) for r in rows]

    def count_movimientos(self, tipo=None, categoria=None,
                          fecha_inicio=None, fecha_fin=None, buscar=None) -> int:
        query = "SELECT COUNT(*) FROM movimientos WHERE 1=1"
        params = []
        if tipo:
            query += " AND tipo = ?"; params.append(tipo)
        if categoria:
            query += " AND categoria = ?"; params.append(categoria)
        if fecha_inicio:
            query += " AND fecha >= ?"; params.append(fecha_inicio)
        if fecha_fin:
            query += " AND fecha <= ?"; params.append(fecha_fin)
        if buscar:
            query += " AND (nombre LIKE ? OR notas LIKE ?)"; params += [f"%{buscar}%", f"%{buscar}%"]
        with self._conectar() as conn:
            return conn.execute(query, params).fetchone()[0]

    # ─── Dashboard ────────────────────────────────────────────────────────────
    def get_resumen_dashboard(self) -> Dict:
        with self._conectar() as conn:
            hoy = date.today()
            mes_actual = hoy.strftime("%Y-%m")
            mes_anterior_dt = date(hoy.year if hoy.month > 1 else hoy.year - 1,
                                   hoy.month - 1 if hoy.month > 1 else 12, 1)
            mes_anterior = mes_anterior_dt.strftime("%Y-%m")

            def suma_mes(tipo, mes):
                r = conn.execute(
                    "SELECT COALESCE(SUM(importe),0) FROM movimientos WHERE tipo=? AND strftime('%Y-%m',fecha)=?",
                    (tipo, mes)
                ).fetchone()[0]
                return round(r, 2)

            gastos_mes = suma_mes("gasto", mes_actual)
            ingresos_mes = suma_mes("ingreso", mes_actual)
            gastos_anterior = suma_mes("gasto", mes_anterior)
            ingresos_anterior = suma_mes("ingreso", mes_anterior)

            total_gastos = conn.execute("SELECT COALESCE(SUM(importe),0) FROM movimientos WHERE tipo='gasto'").fetchone()[0]
            total_ingresos = conn.execute("SELECT COALESCE(SUM(importe),0) FROM movimientos WHERE tipo='ingreso'").fetchone()[0]
            total_movimientos = conn.execute("SELECT COUNT(*) FROM movimientos").fetchone()[0]

            # Últimas transacciones
            ultimas = conn.execute(
                "SELECT * FROM movimientos ORDER BY fecha DESC, id DESC LIMIT 5"
            ).fetchall()

            return {
                "saldo_total": round(total_ingresos - total_gastos, 2),
                "total_gastos": round(total_gastos, 2),
                "total_ingresos": round(total_ingresos, 2),
                "total_movimientos": total_movimientos,
                "gastos_mes_actual": gastos_mes,
                "ingresos_mes_actual": ingresos_mes,
                "gastos_mes_anterior": gastos_anterior,
                "ingresos_mes_anterior": ingresos_anterior,
                "variacion_gastos": round(
                    ((gastos_mes - gastos_anterior) / gastos_anterior * 100) if gastos_anterior > 0 else 0, 1
                ),
                "variacion_ingresos": round(
                    ((ingresos_mes - ingresos_anterior) / ingresos_anterior * 100) if ingresos_anterior > 0 else 0, 1
                ),
                "ultimas_transacciones": [dict(r) for r in ultimas],
                "mes_actual": mes_actual,
            }

    def get_tendencia_mensual(self, meses: int = 6) -> List[Dict]:
        with self._conectar() as conn:
            rows = conn.execute(f"""
                SELECT
                    strftime('%Y-%m', fecha) AS mes,
                    SUM(CASE WHEN tipo='ingreso' THEN importe ELSE 0 END) AS ingresos,
                    SUM(CASE WHEN tipo='gasto'   THEN importe ELSE 0 END) AS gastos
                FROM movimientos
                GROUP BY mes
                ORDER BY mes DESC
                LIMIT {meses}
            """).fetchall()
            return [dict(r) for r in reversed(rows)]

    def get_resumen_categorias(self) -> List[Dict]:
        with self._conectar() as conn:
            hoy = date.today()
            mes_actual = hoy.strftime("%Y-%m")
            rows = conn.execute("""
                SELECT
                    categoria,
                    tipo,
                    SUM(importe) AS total,
                    COUNT(*) AS cantidad
                FROM movimientos
                WHERE strftime('%Y-%m', fecha) = ?
                GROUP BY categoria, tipo
                ORDER BY total DESC
            """, (mes_actual,)).fetchall()
            return [dict(r) for r in rows]

    # ─── Análisis ─────────────────────────────────────────────────────────────
    def get_analisis_completo(self) -> Dict:
        with self._conectar() as conn:
            hoy = date.today()

            # Gasto promedio diario (último mes)
            avg_diario = conn.execute("""
                SELECT COALESCE(AVG(dia_total), 0) FROM (
                    SELECT fecha, SUM(importe) AS dia_total
                    FROM movimientos WHERE tipo='gasto'
                    AND fecha >= date('now','-30 days')
                    GROUP BY fecha
                )
            """).fetchone()[0]

            # Top categorías de gasto (todo el tiempo)
            top_gastos = conn.execute("""
                SELECT categoria, SUM(importe) AS total, COUNT(*) AS veces
                FROM movimientos WHERE tipo='gasto'
                GROUP BY categoria ORDER BY total DESC LIMIT 5
            """).fetchall()

            # Top categorías de ingreso
            top_ingresos = conn.execute("""
                SELECT categoria, SUM(importe) AS total, COUNT(*) AS veces
                FROM movimientos WHERE tipo='ingreso'
                GROUP BY categoria ORDER BY total DESC LIMIT 5
            """).fetchall()

            # Dia de la semana con más gasto
            dia_semana = conn.execute("""
                SELECT strftime('%w', fecha) AS dia, SUM(importe) AS total
                FROM movimientos WHERE tipo='gasto'
                GROUP BY dia ORDER BY total DESC LIMIT 1
            """).fetchone()

            # Evolución anual
            anual = conn.execute("""
                SELECT
                    strftime('%Y-%m', fecha) AS mes,
                    SUM(CASE WHEN tipo='ingreso' THEN importe ELSE 0 END) AS ingresos,
                    SUM(CASE WHEN tipo='gasto'   THEN importe ELSE 0 END) AS gastos,
                    SUM(CASE WHEN tipo='ingreso' THEN importe ELSE -importe END) AS neto
                FROM movimientos
                WHERE fecha >= date('now','-12 months')
                GROUP BY mes ORDER BY mes
            """).fetchall()

            # Distribución categorías todos los gastos
            dist_categorias = conn.execute("""
                SELECT categoria, SUM(importe) AS total
                FROM movimientos WHERE tipo='gasto'
                GROUP BY categoria ORDER BY total DESC
            """).fetchall()

            dias_nombre = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"]

            return {
                "gasto_promedio_diario": round(avg_diario, 2),
                "top_categorias_gasto": [dict(r) for r in top_gastos],
                "top_categorias_ingreso": [dict(r) for r in top_ingresos],
                "dia_mayor_gasto": dias_nombre[int(dia_semana[0])] if dia_semana else "N/D",
                "evolucion_anual": [dict(r) for r in anual],
                "distribucion_categorias": [dict(r) for r in dist_categorias],
            }

    # ─── Categorías ───────────────────────────────────────────────────────────
    def get_categorias(self) -> List[Dict]:
        with self._conectar() as conn:
            rows = conn.execute("SELECT * FROM categorias ORDER BY tipo, nombre").fetchall()
            return [dict(r) for r in rows]

    # ─── Ajustes ──────────────────────────────────────────────────────────────
    def get_ajustes(self) -> Dict:
        with self._conectar() as conn:
            rows = conn.execute("SELECT clave, valor FROM ajustes").fetchall()
            resultado = {}
            for row in rows:
                try:
                    resultado[row["clave"]] = json.loads(row["valor"])
                except Exception:
                    resultado[row["clave"]] = row["valor"]
            return resultado

    def guardar_ajustes(self, ajustes: Ajustes):
        datos = ajustes.dict(exclude_none=True)
        with self._conectar() as conn:
            for clave, valor in datos.items():
                conn.execute(
                    "INSERT OR REPLACE INTO ajustes (clave, valor) VALUES (?,?)",
                    (clave, json.dumps(valor))
                )

    # ─── Exportar / Importar ──────────────────────────────────────────────────
    def exportar_todo(self) -> Dict:
        with self._conectar() as conn:
            movimientos = [dict(r) for r in conn.execute("SELECT * FROM movimientos ORDER BY fecha").fetchall()]
            ajustes = self.get_ajustes()
            return {
                "version": "1.0",
                "exportado_en": datetime.now().isoformat(),
                "movimientos": movimientos,
                "ajustes": ajustes,
            }

    def importar_todo(self, datos: Dict) -> int:
        movimientos = datos.get("movimientos", [])
        with self._conectar() as conn:
            for mov in movimientos:
                conn.execute("""
                    INSERT OR IGNORE INTO movimientos
                    (tipo, nombre, importe, fecha, categoria, notas, creado_en)
                    VALUES (?,?,?,?,?,?,?)
                """, (
                    mov.get("tipo"), mov.get("nombre"), mov.get("importe"),
                    mov.get("fecha"), mov.get("categoria"),
                    mov.get("notas", ""), mov.get("creado_en", datetime.now().isoformat())
                ))
        return len(movimientos)

    def borrar_todo(self):
        with self._conectar() as conn:
            conn.execute("DELETE FROM movimientos")
