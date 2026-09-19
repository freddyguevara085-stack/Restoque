@echo off
echo ==========================================
echo      Deteniendo Restoque POS...
echo ==========================================

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Servidor detenido con exito.
