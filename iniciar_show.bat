@echo off
setlocal enabledelayedexpansion
title Phonelight Bridge - Configurador Pro

:: Intentar leer la última URL guardada
set "LAST_URL="
if exist url_config.txt (
    set /p LAST_URL=<url_config.txt
)

echo ==========================================
echo    CONFIGURACION DE RED Y RAILWAY
echo ==========================================
echo.

set /p IP_RED="> Introduce la IP de tu tarjeta de red: "
set /p SUBNET="> Introduce el Subnet (0): "
set /p UNIV="> Introduce el Universo (0): "

echo.
echo ------------------------------------------
if "%LAST_URL%"=="" (
    echo No hay URL guardada.
) else (
    echo ULTIMA URL: %LAST_URL%
)
echo ------------------------------------------
echo.
echo Pega la URL de Railway (ej: https://xxx.up.railway.app)
echo Si quieres usar la ultima, solo pulsa ENTER.
set /p INPUT_URL="> URL Railway: "

if "%INPUT_URL%"=="" (
    set "FINAL_URL=%LAST_URL%"
) else (
    set "FINAL_URL=%INPUT_URL%"
)

:: Limpiar barras finales si el usuario las puso
if "%FINAL_URL:~-1%"=="/" set "FINAL_URL=%FINAL_URL:~0,-1%"

:: Guardar la URL limpia para la proxima vez
echo %FINAL_URL% > url_config.txt

:: Añadir el endpoint automaticamente
set "URL_API=%FINAL_URL%/updateColor"

echo.
echo 🚀 Iniciando Bridge...
echo 🔗 Destino: %URL_API%
echo.

node bridge.js %IP_RED% %SUBNET% %UNIV% %URL_API%

pause