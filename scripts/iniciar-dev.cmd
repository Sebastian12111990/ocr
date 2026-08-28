@echo off
setlocal

rem Inicio del entorno de desarrollo usando solamente cmd.exe.
rem Se puede ejecutar desde cualquier directorio o mediante doble clic.

pushd "%~dp0.." || (
    echo ERROR: No se pudo acceder a la raiz del repositorio.
    exit /b 1
)
set "RAIZ=%CD%"

echo Levantando Postgres ^(docker compose^)...
docker compose up -d
if errorlevel 1 (
    echo.
    echo ERROR: No se pudo levantar Postgres.
    popd
    exit /b 1
)
popd

echo Abriendo consola: servicio de vision ^(services/cv^)...
start "OCR - services/cv (:8000)" /D "%RAIZ%\services\cv" cmd.exe /K "call .venv\Scripts\activate.bat && uvicorn app:app --reload --port 8000"

echo Abriendo consola: API ^(apps/api^)...
start "OCR - apps/api (:6000)" /D "%RAIZ%\apps\api" cmd.exe /K "npm run dev"

echo Abriendo consola: Frontend ^(apps/web^)...
start "OCR - apps/web (:5175)" /D "%RAIZ%\apps\web" cmd.exe /K "npm run dev"

echo.
echo Listo. Postgres esta arriba en segundo plano y se abrieron 3 ventanas:
echo   - services/cv  - http://localhost:8000
echo   - apps/api     - http://localhost:6000/api/salud
echo   - apps/web     - http://localhost:5175
echo.
echo Para detener: cierra las 3 ventanas y ejecuta "docker compose down" desde la raiz del repositorio.

endlocal
