@echo off
title VWallet - Gestor de Gastos
color 0A

echo.
echo  ======================================
echo   VWallet - Gestor de Gastos Personales
echo  ======================================
echo.

cd /d "%~dp0"

:: ── Buscar Python compatible (3.9 - 3.13) ───────────────────────────────────
set PYEXE=

py -3.13 --version >nul 2>&1
if not errorlevel 1 ( set PYEXE=py -3.13 & goto :found )

py -3.12 --version >nul 2>&1
if not errorlevel 1 ( set PYEXE=py -3.12 & goto :found )

py -3.11 --version >nul 2>&1
if not errorlevel 1 ( set PYEXE=py -3.11 & goto :found )

py -3.10 --version >nul 2>&1
if not errorlevel 1 ( set PYEXE=py -3.10 & goto :found )

py -3.9 --version >nul 2>&1
if not errorlevel 1 ( set PYEXE=py -3.9 & goto :found )

if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" ( set PYEXE="%LOCALAPPDATA%\Programs\Python\Python313\python.exe" & goto :found )
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" ( set PYEXE="%LOCALAPPDATA%\Programs\Python\Python312\python.exe" & goto :found )
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" ( set PYEXE="%LOCALAPPDATA%\Programs\Python\Python311\python.exe" & goto :found )

python --version >nul 2>&1
if not errorlevel 1 ( set PYEXE=python & goto :found )

echo [ERROR] No se encontro Python. Instala Python 3.12 desde python.org
pause
exit /b 1

:found
echo [INFO] Usando: & %PYEXE% --version

:: ── Instalar dependencias (silencioso) ──────────────────────────────────────
echo [INFO] Instalando dependencias...
%PYEXE% -m pip install fastapi==0.115.0 "uvicorn[standard]==0.30.6" "pydantic[email]==2.9.2" httpx==0.27.2 -q --no-warn-script-location >nul 2>&1

if errorlevel 1 (
    %PYEXE% -m pip install fastapi==0.115.0 "uvicorn[standard]==0.30.6" "pydantic[email]==2.9.2" httpx==0.27.2 -q --user --no-warn-script-location >nul 2>&1
)

:: Verificar que se instaló correctamente
%PYEXE% -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] No se pudo instalar fastapi.
    echo [INFO]  Instala Python 3.12 desde: https://python.org/downloads/release/python-3128/
    pause
    exit /b 1
)

echo [INFO] Dependencias listas.
echo.
echo [OK] Iniciando VWallet en http://localhost:8000
echo [INFO] Abre el navegador en: http://localhost:8000
echo [INFO] Presiona Ctrl+C para detener
echo.

cd backend
%PYEXE% main.py

pause
