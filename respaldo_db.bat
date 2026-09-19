@echo off
setlocal enabledelayedexpansion

set "DB_FILE=%~dp0restoque.db"

:: Detectar carpeta de respaldo (OneDrive prioritario, luego Google Drive o carpeta local)
if exist "%USERPROFILE%\OneDrive" (
    set "DEST_DIR=%USERPROFILE%\OneDrive\Restoque_Backups"
) else if exist "%USERPROFILE%\Google Drive" (
    set "DEST_DIR=%USERPROFILE%\Google Drive\Restoque_Backups"
) else (
    set "DEST_DIR=%~dp0backups"
)

if not exist "!DEST_DIR!" mkdir "!DEST_DIR!"

:: Generar marca de tiempo
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set "dt=%%I"
if not defined dt (
    set "BACKUP_NAME=restoque_backup.db"
) else (
    set "BACKUP_NAME=restoque_!dt:~0,4!-!dt:~4,2!-!dt:~6,2!_!dt:~8,2!-!dt:~10,2!.db"
)

set "TARGET=!DEST_DIR!\%BACKUP_NAME%"

echo ======================================================
echo    Respaldo Atomico de Base de Datos - Restoque POS
echo ======================================================

py -3 -c "import sqlite3; src = sqlite3.connect(r'%DB_FILE%'); dst = sqlite3.connect(r'%TARGET%'); src.backup(dst); dst.close(); src.close()"

if %ERRORLEVEL% equ 0 (
    echo [OK] Respaldo guardado exitosamente en:
    echo      %TARGET%
) else (
    echo [ERROR] No se pudo completar el respaldo.
)
