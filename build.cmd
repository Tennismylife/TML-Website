@echo off
REM =========================
REM Build stabile Next.js in OneDrive
REM e copia in C:\TennisBuild
REM =========================

echo ===============================
echo Pulisce cache e cartella build
echo ===============================

REM Cancella cartella build solo se esiste
if exist ".next_build" (
    echo Cancella cartella .next_build...
    rd /s /q ".next_build"
)

REM Cancella cache di node_modules solo se esiste
if exist "node_modules\.cache" (
    echo Cancella node_modules\.cache...
    rd /s /q "node_modules\.cache"
)

REM Pulizia cache yarn
echo Pulizia cache yarn...
yarn cache clean

echo ===============================
echo Reinstalla dipendenze
echo ===============================
yarn install

echo ===============================
echo Imposta polling watcher per OneDrive
echo ===============================
set CHOKIDAR_USEPOLLING=true

echo ===============================
echo Build del progetto
echo ===============================
yarn build

echo ===============================
echo Copia build in C:\TennisBuild
echo ===============================
set TARGET_BUILD=C:\TennisBuild

REM Crea cartella di destinazione se non esiste
if not exist "%TARGET_BUILD%" (
    mkdir "%TARGET_BUILD%"
)

REM Copia build con robocopy (mirroring)
robocopy ".next_build" "%TARGET_BUILD%" /MIR /NFL /NDL /NJH /NJS /nc /ns /np

echo ===============================
echo Build completata e copiata in %TARGET_BUILD%!
echo ===============================
pause
