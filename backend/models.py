"""
Modelos de datos - Pydantic
Define la estructura de los datos que entran y salen de la API.
"""

from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import date


class Movimiento(BaseModel):
    tipo: str                        # 'gasto' o 'ingreso'
    nombre: str
    importe: float
    fecha: str                       # formato YYYY-MM-DD
    categoria: str
    notas: Optional[str] = ""

    @validator("tipo")
    def tipo_valido(cls, v):
        if v not in ("gasto", "ingreso"):
            raise ValueError("El tipo debe ser 'gasto' o 'ingreso'")
        return v

    @validator("importe")
    def importe_positivo(cls, v):
        if v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return round(v, 2)

    @validator("nombre")
    def nombre_no_vacio(cls, v):
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()


class Ajustes(BaseModel):
    moneda: Optional[str] = "EUR"
    simbolo_moneda: Optional[str] = "€"
    grok_api_key: Optional[str] = None
    tema: Optional[str] = "dark"     # 'light' o 'dark'
    nombre_usuario: Optional[str] = None
    presupuesto_mensual: Optional[float] = None


class MensajeHistorial(BaseModel):
    role: str    # 'user' o 'assistant'
    content: str


class ChatMessage(BaseModel):
    mensaje: str
    api_key: str
    historial: Optional[List[MensajeHistorial]] = []
