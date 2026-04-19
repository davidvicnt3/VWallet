#!/bin/bash
# VWallet - Script de inicio (Linux/Mac)

echo ""
echo "  ======================================"
echo "   VWallet - Gestor de Gastos Personal"
echo "  ======================================"
echo ""

# Verificar Python
if ! command -v python3 &>/dev/null; then
    echo "[ERROR] Python3 no encontrado. Instálalo desde python.org"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    echo "[INFO] Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
echo "[INFO] Instalando dependencias..."
pip install -r requirements.txt -q

echo ""
echo "[OK] Iniciando VWallet en http://localhost:8000"
echo "[INFO] Abre tu navegador en: http://localhost:8000"
echo "[INFO] Presiona Ctrl+C para detener"
echo ""

cd backend
python main.py
