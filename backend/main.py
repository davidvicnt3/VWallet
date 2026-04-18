"""
Gestor de Gastos Personales - Backend
FastAPI + SQLite
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import os
import json
from datetime import datetime
from pathlib import Path

# Importar módulos locales
from database import Database
from models import Movimiento, Ajustes, ChatMessage
from ai_service import consultar_ia

# ─── Inicialización ───────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
FRONTEND_DIR = BASE_DIR / "frontend"
DATA_DIR.mkdir(exist_ok=True)

db = Database(DATA_DIR / "gastos.db")

app = FastAPI(title="Gestor de Gastos", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos estáticos del frontend
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


# ─── Rutas Frontend ───────────────────────────────────────────────────────────
@app.get("/")
def index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


# ─── API Movimientos ──────────────────────────────────────────────────────────
@app.get("/api/movimientos")
def get_movimientos(
    tipo: Optional[str] = None,
    categoria: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    buscar: Optional[str] = None,
    limite: int = Query(default=100, le=500),
    offset: int = 0,
):
    """Obtener lista de movimientos con filtros opcionales."""
    movimientos = db.get_movimientos(
        tipo=tipo,
        categoria=categoria,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        buscar=buscar,
        limite=limite,
        offset=offset,
    )
    total = db.count_movimientos(
        tipo=tipo,
        categoria=categoria,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        buscar=buscar,
    )
    return {"movimientos": movimientos, "total": total}


@app.post("/api/movimientos")
def crear_movimiento(movimiento: Movimiento):
    """Registrar un nuevo gasto o ingreso."""
    nuevo_id = db.insertar_movimiento(movimiento)
    return {"id": nuevo_id, "mensaje": "Movimiento registrado correctamente"}


@app.put("/api/movimientos/{movimiento_id}")
def actualizar_movimiento(movimiento_id: int, movimiento: Movimiento):
    """Editar un movimiento existente."""
    ok = db.actualizar_movimiento(movimiento_id, movimiento)
    if not ok:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    return {"mensaje": "Movimiento actualizado correctamente"}


@app.delete("/api/movimientos/{movimiento_id}")
def eliminar_movimiento(movimiento_id: int):
    """Eliminar un movimiento."""
    ok = db.eliminar_movimiento(movimiento_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    return {"mensaje": "Movimiento eliminado correctamente"}


# ─── API Dashboard ────────────────────────────────────────────────────────────
@app.get("/api/dashboard")
def get_dashboard():
    """Datos resumen para el dashboard."""
    return db.get_resumen_dashboard()


@app.get("/api/dashboard/tendencia")
def get_tendencia(meses: int = 6):
    """Evolución de gastos e ingresos por mes."""
    return db.get_tendencia_mensual(meses)


@app.get("/api/dashboard/categorias")
def get_categorias_resumen():
    """Gastos agrupados por categoría."""
    return db.get_resumen_categorias()


# ─── API Análisis ─────────────────────────────────────────────────────────────
@app.get("/api/analisis")
def get_analisis():
    """Análisis detallado de la economía del usuario."""
    return db.get_analisis_completo()


# ─── API Categorías ───────────────────────────────────────────────────────────
@app.get("/api/categorias")
def get_categorias():
    """Lista de categorías disponibles."""
    return db.get_categorias()


# ─── API Ajustes ──────────────────────────────────────────────────────────────
@app.get("/api/ajustes")
def get_ajustes():
    """Obtener configuración guardada."""
    return db.get_ajustes()


@app.put("/api/ajustes")
def guardar_ajustes(ajustes: Ajustes):
    """Guardar configuración del usuario."""
    db.guardar_ajustes(ajustes)
    return {"mensaje": "Ajustes guardados"}


@app.get("/api/ajustes/exportar")
def exportar_datos():
    """Exportar todos los datos como JSON."""
    datos = db.exportar_todo()
    return JSONResponse(content=datos, headers={
        "Content-Disposition": f'attachment; filename="gastos_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json"'
    })


@app.post("/api/ajustes/importar")
def importar_datos(payload: dict):
    """Importar datos desde JSON."""
    try:
        count = db.importar_todo(payload)
        return {"mensaje": f"Importados {count} movimientos correctamente"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al importar: {str(e)}")


@app.delete("/api/ajustes/borrar-todo")
def borrar_todo():
    """Eliminar todos los datos del usuario."""
    db.borrar_todo()
    return {"mensaje": "Todos los datos han sido eliminados"}


# ─── API IA ───────────────────────────────────────────────────────────────────
@app.post("/api/ia/chat")
async def chat_ia(mensaje: ChatMessage):
    """Enviar mensaje a la IA con contexto financiero."""
    # Obtener contexto financiero del usuario
    contexto = db.get_resumen_dashboard()
    categorias = db.get_resumen_categorias()
    
    respuesta = await consultar_ia(
        api_key=mensaje.api_key,
        mensaje=mensaje.mensaje,
        historial=mensaje.historial,
        contexto_financiero={"resumen": contexto, "categorias": categorias}
    )
    return {"respuesta": respuesta}


# ─── Arranque ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🚀 Iniciando Gestor de Gastos en http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
