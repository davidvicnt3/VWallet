"""
Servicio de IA - Groq API
Gestiona las conversaciones con la IA incluyendo contexto financiero.
Groq es gratuito: regístrate en https://console.groq.com
"""

import httpx
from typing import List, Dict, Any, Optional


GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"  # Rápido y gratuito

SISTEMA_FINANCIERO = """Eres un asesor financiero personal experto y amigable llamado "VBot".
Tu objetivo es ayudar al usuario a mejorar su salud financiera, ahorrar más dinero y tomar mejores decisiones económicas.

INSTRUCCIONES:
- Responde siempre en español
- Sé conciso pero completo
- Usa emojis ocasionalmente para hacer la conversación más amena
- Basa tus consejos en los datos financieros reales del usuario cuando estén disponibles
- Da consejos prácticos y accionables
- Si el usuario pregunta sobre sus gastos, analiza los datos que tienes disponibles
- Mantén un tono positivo y motivador
- No inventes datos; si no tienes información, dilo claramente

Cuando tengas datos financieros del usuario, úsalos para personalizar tus respuestas."""


async def consultar_ia(
    api_key: str,
    mensaje: str,
    historial: List[Any],
    contexto_financiero: Optional[Dict] = None,
) -> str:
    if not api_key or not api_key.strip():
        raise ValueError("Se requiere una clave de API de Groq válida.")

    # Construir mensaje de sistema con contexto financiero
    sistema = SISTEMA_FINANCIERO
    if contexto_financiero:
        resumen = contexto_financiero.get("resumen", {})
        categorias = contexto_financiero.get("categorias", [])
        sistema += f"""

DATOS FINANCIEROS ACTUALES DEL USUARIO:
- Saldo total: {resumen.get('saldo_total', 0):.2f}€
- Gastos del mes actual: {resumen.get('gastos_mes_actual', 0):.2f}€
- Ingresos del mes actual: {resumen.get('ingresos_mes_actual', 0):.2f}€
- Total de movimientos registrados: {resumen.get('total_movimientos', 0)}
- Variación gastos vs mes anterior: {resumen.get('variacion_gastos', 0):+.1f}%
- Variación ingresos vs mes anterior: {resumen.get('variacion_ingresos', 0):+.1f}%

GASTOS POR CATEGORÍA (MES ACTUAL):
{_formatear_categorias(categorias)}"""

    # Construir mensajes
    mensajes = [{"role": "system", "content": sistema}]
    for msg in historial:
        mensajes.append({"role": msg.role, "content": msg.content})
    mensajes.append({"role": "user", "content": mensaje})

    # Llamar a la API de Groq (compatible con OpenAI)
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": mensajes,
                "max_tokens": 1024,
                "temperature": 0.7,
            }
        )

    if response.status_code == 401:
        raise ValueError("API Key inválida. Verifica tu clave en console.groq.com")
    elif response.status_code == 429:
        raise ValueError("Límite de solicitudes alcanzado. Espera un momento e inténtalo de nuevo.")
    elif response.status_code != 200:
        raise ValueError(f"Error de la API ({response.status_code}): {response.text}")

    data = response.json()
    return data["choices"][0]["message"]["content"]


def _formatear_categorias(categorias: List[Dict]) -> str:
    if not categorias:
        return "Sin datos de categorías este mes."
    lineas = []
    for cat in categorias[:8]:
        tipo = "💸" if cat.get("tipo") == "gasto" else "💰"
        lineas.append(f"  {tipo} {cat.get('categoria')}: {cat.get('total', 0):.2f}€ ({cat.get('cantidad', 0)} transacciones)")
    return "\n".join(lineas) if lineas else "Sin datos."

