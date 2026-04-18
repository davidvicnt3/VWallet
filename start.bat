@echo off
title FinFlow - Gestor de Gastos
color 0A

echo.
echo  ======================================
echo   FinFlow - Gestor de Gastos Personal
echo  ======================================
echo.

:: Ir a la carpeta raiz del proyecto
cd /d "%~dp0"

:: Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no encontrado. Instala Python desde python.org
    pause
    exit /b 1
)

echo [INFO] Usando:
python --version

:: Instalar dependencias directamente (sin venv)
echo [INFO] Instalando dependencias...
python -m pip install fastapi==0.115.0 "uvicorn[standard]==0.30.6" "pydantic[email]==2.9.2" httpx==0.27.2 --quiet --break-system-packages 2>nul
python -m pip install fastapi==0.115.0 "uvicorn[standard]==0.30.6" "pydantic[email]==2.9.2" httpx==0.27.2 --quiet 2>nul

echo.
echo [OK] Iniciando FinFlow en http://localhost:8000
echo [INFO] Abre tu navegador en: http://localhost:8000
echo [INFO] Presiona Ctrl+C para detener
echo.

cd backend
python main.py

pause


