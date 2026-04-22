# ai_service.py — Comunicación con la API de Groq (IA gratuita)
# Documentación: https://console.groq.com

import httpx
from typing import List, Dict, Optional

GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

# Instrucciones base que recibe la IA en cada conversación
SISTEMA = """Eres VBot, un asesor financiero personal amigable.
Responde siempre en español, de forma concisa y con consejos prácticos.
Usa los datos financieros del usuario cuando estén disponibles."""


async def consultar_ia(api_key: str, mensaje: str, historial: List, contexto_financiero: Optional[Dict] = None) -> str:
    """Envía un mensaje a Groq y devuelve la respuesta como texto."""
    if not api_key or not api_key.strip():
        raise ValueError("Se requiere una clave de API de Groq.")

    # Añadir los datos financieros del usuario al prompt del sistema
    sistema = SISTEMA
    if contexto_financiero:
        r  = contexto_financiero.get("resumen", {})
        cs = contexto_financiero.get("categorias", [])
        cats = "\n".join(
            f"  {'💸' if c['tipo']=='gasto' else '💰'} {c['categoria']}: {c['total']:.2f}€"
            for c in cs[:8]
        ) or "Sin datos."
        sistema += f"""

DATOS DEL USUARIO ESTE MES:
- Saldo total: {r.get('saldo_total', 0):.2f}€
- Gastos: {r.get('gastos_mes_actual', 0):.2f}€  |  Ingresos: {r.get('ingresos_mes_actual', 0):.2f}€
- Movimientos registrados: {r.get('total_movimientos', 0)}
- Variación gastos vs mes anterior: {r.get('variacion_gastos', 0):+.1f}%

GASTOS POR CATEGORÍA:
{cats}"""

    # Construir el array de mensajes: sistema + historial + mensaje nuevo
    mensajes = [{"role": "system", "content": sistema}]
    mensajes += [{"role": m.role, "content": m.content} for m in historial]
    mensajes.append({"role": "user", "content": mensaje})

    # Llamar a la API de Groq
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": GROQ_MODEL, "messages": mensajes, "max_tokens": 1024, "temperature": 0.7},
        )

    if res.status_code == 401: raise ValueError("API Key inválida. Verifica tu clave en console.groq.com")
    if res.status_code == 429: raise ValueError("Límite de solicitudes alcanzado. Espera un momento.")
    if res.status_code != 200: raise ValueError(f"Error de la API ({res.status_code}): {res.text}")

    return res.json()["choices"][0]["message"]["content"]
