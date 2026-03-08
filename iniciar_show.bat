@echo off
title Lanzador Phonelight Pro - Estadio
cls
echo ==========================================
echo   CONFIGURACION DE RED ART-NET
echo ==========================================
echo.

set /p IP_ADRESS="> Introduce la IP de tu tarjeta de red (ej. 192.168.1.10): "
set /p SUBNET="> Introduce el Subnet (normalmente 0): "
set /p UNIVERSE="> Introduce el Universo (normalmente 0): "

echo.
echo ------------------------------------------
echo Iniciando Bridge con IP %IP_ADRESS% en Universo %SUBNET%:%UNIVERSE%
echo ------------------------------------------

:: Pasamos las variables al script de Node
node bridge.js %IP_ADRESS% %SUBNET% %UNIVERSE%

pause