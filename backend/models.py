# models.py — Estructuras de datos que entran y salen de la API
# Pydantic valida automáticamente los datos antes de procesarlos

from pydantic import BaseModel, field_validator
from typing import Optional, List


class Movimiento(BaseModel):
    tipo: str       # solo "gasto" o "ingreso"
    nombre: str
    importe: float
    fecha: str      # formato YYYY-MM-DD
    categoria: str
    notas: Optional[str] = ""

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v):
        if v not in ("gasto", "ingreso"):
            raise ValueError("Debe ser 'gasto' o 'ingreso'")
        return v

    @field_validator("importe")
    @classmethod
    def importe_positivo(cls, v):
        if v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return round(v, 2)

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v):
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()


class Ajustes(BaseModel):
    moneda: Optional[str] = "EUR"
    simbolo_moneda: Optional[str] = "€"
    groq_api_key: Optional[str] = None
    tema: Optional[str] = "dark"
    nombre_usuario: Optional[str] = None
    presupuesto_mensual: Optional[float] = None


class MensajeHistorial(BaseModel):
    role: str       # "user" o "assistant"
    content: str


class ChatMessage(BaseModel):
    mensaje: str
    api_key: str
    historial: Optional[List[MensajeHistorial]] = []
