# 💰 FinFlow — Gestor de Gastos Personal

Aplicación web completa para gestionar tus finanzas personales, con dashboard interactivo, historial de movimientos, análisis económico y asistente de IA.

## 🧱 Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend | **Python 3.9+** con **FastAPI** |
| Base de datos | **SQLite** (archivo local, sin configuración) |
| Frontend | **HTML + CSS + JavaScript** puro |
| Gráficos | **Chart.js** |
| IA | **Grok API** (xAI) |

---

## 🚀 Instalación y despliegue

### Requisitos previos
- **Python 3.9 o superior** → [python.org](https://www.python.org/downloads/)
- Conexión a internet (solo para cargar fuentes y Chart.js)

### Opción A — Script automático (recomendado)

**Windows:**
```
Doble clic en start.bat
```

**Linux / Mac:**
```bash
chmod +x start.sh
./start.sh
```

### Opción B — Manual

```bash
# 1. Clonar o descomprimir el proyecto
cd gastos-app

# 2. Crear entorno virtual
python -m venv venv

# 3. Activar entorno virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 4. Instalar dependencias
pip install -r requirements.txt

# 5. Iniciar el servidor
cd backend
python main.py
```

### Abrir la aplicación
Abre tu navegador en: **http://localhost:8000**

---

## 📁 Estructura del proyecto

```
gastos-app/
├── backend/
│   ├── main.py          # Servidor FastAPI + rutas API
│   ├── database.py      # Acceso a datos SQLite
│   ├── models.py        # Modelos Pydantic (validación)
│   └── ai_service.py    # Integración con Grok API
├── frontend/
│   ├── index.html       # Página principal (SPA)
│   ├── css/
│   │   └── main.css     # Estilos completos + temas
│   └── js/
│       ├── api.js       # Cliente HTTP para el backend
│       ├── app.js       # Lógica principal + utilidades
│       ├── charts.js    # Helpers de Chart.js
│       └── sections/
│           ├── dashboard.js
│           ├── movimientos.js
│           ├── historial.js
│           ├── analisis.js
│           ├── ia.js
│           └── ajustes.js
├── data/
│   └── gastos.db        # Base de datos SQLite (se crea automáticamente)
├── requirements.txt
├── start.bat            # Inicio rápido Windows
├── start.sh             # Inicio rápido Linux/Mac
└── README.md
```

---

## ✨ Funcionalidades

### 📊 Dashboard
- Saldo total, gastos e ingresos del mes con comparativa vs mes anterior
- Gráfico de barras: tendencia de últimos 6 meses
- Gráfico de dona: distribución de gastos por categoría
- Gráfico de línea: evolución del balance neto
- Últimas 5 transacciones

### ➕ Movimientos
- Registro rápido de gastos e ingresos
- Selector de tipo, nombre, importe, fecha, categoría y notas
- Botones de categorías frecuentes para acceso rápido

### 🗂️ Historial
- Tabla completa de todos los movimientos
- Filtros por tipo, categoría, rango de fechas y búsqueda por nombre
- Paginación (20 registros por página)
- Editar y eliminar movimientos

### 📈 Análisis
- Gasto promedio diario (últimos 30 días)
- Tasa de ahorro (ingresos vs gastos)
- Día de la semana con mayor gasto
- Evolución anual (12 meses)
- Top categorías con barras de progreso
- Distribución histórica por categoría

### 🤖 Asistente IA
- Chat con Grok (xAI) con contexto financiero personalizado
- La IA conoce tus gastos e ingresos para dar consejos relevantes
- Historial de conversación en sesión
- Sugerencias de preguntas frecuentes
- API Key guardada de forma segura

### ⚙️ Ajustes
- Cambiar nombre de usuario, moneda y presupuesto mensual
- Exportar todos los datos a `.json`
- Importar datos desde `.json` (acumulativo, no sobreescribe)
- Borrar todos los datos (con confirmación por texto)
- Cambio de tema claro/oscuro (también desde el sidebar)

---

## 🔑 Configurar la IA (Grok)

1. Regístrate en [console.x.ai](https://console.x.ai)
2. Crea una API Key gratuita
3. En la app, ve a **Asistente IA** e introduce tu clave
4. Haz clic en **Guardar** — la clave se almacena localmente

> La aplicación funciona perfectamente sin la API Key. Solo el apartado de IA requiere la clave.

---

## 🎨 Temas

Cambia entre tema **oscuro** y **claro** desde:
- El botón 🌙/☀️ en la parte inferior del sidebar
- El apartado **Ajustes → Apariencia**

---

## 🔌 API REST

El backend expone una API REST completa en `http://localhost:8000`. Puedes explorarla en:
- **Documentación interactiva:** http://localhost:8000/docs
- **OpenAPI JSON:** http://localhost:8000/openapi.json

### Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/movimientos` | Listar movimientos (con filtros) |
| POST | `/api/movimientos` | Crear movimiento |
| PUT | `/api/movimientos/{id}` | Actualizar movimiento |
| DELETE | `/api/movimientos/{id}` | Eliminar movimiento |
| GET | `/api/dashboard` | Resumen para dashboard |
| GET | `/api/dashboard/tendencia` | Tendencia mensual |
| GET | `/api/analisis` | Análisis completo |
| GET | `/api/ajustes/exportar` | Exportar datos JSON |
| POST | `/api/ajustes/importar` | Importar datos JSON |
| DELETE | `/api/ajustes/borrar-todo` | Eliminar todo |
| POST | `/api/ia/chat` | Chat con IA |

---

## 🛠️ Modificar y extender

El código está organizado para ser fácilmente modificable:

- **Añadir una categoría:** edita `_insertar_categorias_default()` en `database.py`
- **Cambiar colores/fuentes:** edita las variables CSS en `css/main.css`
- **Añadir un campo al movimiento:** modifica `models.py`, `database.py` (tabla + queries) y el formulario en `index.html`/`movimientos.js`
- **Cambiar el modelo de IA:** edita `GROK_MODEL` en `ai_service.py`
- **Añadir una nueva sección:** crea `frontend/js/sections/nueva.js`, añade el nav-item en `index.html` y regístralo en `SECCIONES` en `app.js`

---

## 📄 Licencia

Proyecto personal de código abierto. Úsalo, modifícalo y distribúyelo libremente.
