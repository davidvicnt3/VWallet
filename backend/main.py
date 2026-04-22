# main.py — Servidor web y definición de todos los endpoints de la API
# FastAPI recibe las peticiones HTTP del navegador y responde con JSON

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import datetime
from pathlib import Path
import uvicorn

from database import Database
from models import Movimiento, Ajustes, ChatMessage
from ai_service import consultar_ia

# ── Configuración inicial ─────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).parent.parent
DATA_DIR     = BASE_DIR / "data"
FRONTEND_DIR = BASE_DIR / "frontend"
DATA_DIR.mkdir(exist_ok=True)

db  = Database(DATA_DIR / "gastos.db")
app = FastAPI(title="VWallet")

# Permitir peticiones desde cualquier origen (necesario para el frontend)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Servir los archivos CSS, JS, etc. de la carpeta frontend/
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


# ── Página principal ──────────────────────────────────────────────────────────
@app.get("/")
def index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


# ── Movimientos ───────────────────────────────────────────────────────────────
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
    """Lista de movimientos con filtros opcionales y paginación."""
    movimientos = db.get_movimientos(tipo, categoria, fecha_inicio, fecha_fin, buscar, limite, offset)
    total       = db.count_movimientos(tipo, categoria, fecha_inicio, fecha_fin, buscar)
    return {"movimientos": movimientos, "total": total}


@app.post("/api/movimientos")
def crear_movimiento(movimiento: Movimiento):
    return {"id": db.insertar_movimiento(movimiento), "mensaje": "Movimiento registrado"}


@app.put("/api/movimientos/{mid}")
def actualizar_movimiento(mid: int, movimiento: Movimiento):
    if not db.actualizar_movimiento(mid, movimiento):
        raise HTTPException(404, "Movimiento no encontrado")
    return {"mensaje": "Movimiento actualizado"}


@app.delete("/api/movimientos/{mid}")
def eliminar_movimiento(mid: int):
    if not db.eliminar_movimiento(mid):
        raise HTTPException(404, "Movimiento no encontrado")
    return {"mensaje": "Movimiento eliminado"}


# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.get("/api/dashboard")           # Resumen del mes (saldo, gastos, ingresos...)
def get_dashboard():                 return db.get_resumen_dashboard()

@app.get("/api/dashboard/tendencia") # Gastos e ingresos agrupados por mes
def get_tendencia(meses: int = 6):   return db.get_tendencia_mensual(meses)

@app.get("/api/dashboard/categorias")# Gastos del mes actual por categoría
def get_categorias_resumen():        return db.get_resumen_categorias()


# ── Análisis, categorías y ajustes ────────────────────────────────────────────
@app.get("/api/analisis")
def get_analisis():     return db.get_analisis_completo()

@app.get("/api/categorias")
def get_categorias():   return db.get_categorias()

@app.get("/api/ajustes")
def get_ajustes():      return db.get_ajustes()

@app.put("/api/ajustes")
def guardar_ajustes(ajustes: Ajustes):
    db.guardar_ajustes(ajustes)
    return {"mensaje": "Ajustes guardados"}


# ── Exportar / Importar / Borrar ──────────────────────────────────────────────
@app.get("/api/ajustes/exportar")
def exportar_datos():
    """Descarga todos los datos como fichero JSON."""
    nombre = f'gastos_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    return JSONResponse(content=db.exportar_todo(), headers={"Content-Disposition": f'attachment; filename="{nombre}"'})


@app.post("/api/ajustes/importar")
def importar_datos(payload: dict):
    try:
        count = db.importar_todo(payload)
        return {"mensaje": f"Importados {count} movimientos"}
    except Exception as e:
        raise HTTPException(400, f"Error al importar: {e}")


@app.delete("/api/ajustes/borrar-todo")
def borrar_todo():
    db.borrar_todo()
    return {"mensaje": "Datos eliminados"}


# ── Asistente IA ──────────────────────────────────────────────────────────────
@app.post("/api/ia/chat")
async def chat_ia(msg: ChatMessage):
    """Envía el mensaje a Groq junto con el contexto financiero del usuario."""
    contexto = {
        "resumen":    db.get_resumen_dashboard(),
        "categorias": db.get_resumen_categorias(),
    }
    respuesta = await consultar_ia(msg.api_key, msg.mensaje, msg.historial, contexto)
    return {"respuesta": respuesta}


# ── Arranque ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🚀 VWallet → http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
