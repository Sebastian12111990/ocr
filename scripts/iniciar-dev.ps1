<#
Levanta el editor OCR completo para desarrollo: Postgres (docker compose) en
segundo plano, y una ventana de consola nueva por cada servicio (services/cv,
apps/api, apps/web) para poder ver sus logs por separado.

Uso: desde cualquier ubicación
    powershell -ExecutionPolicy Bypass -File scripts\iniciar-dev.ps1
o con doble clic en scripts\iniciar-dev.bat
#>

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot

function Iniciar-Ventana {
    param(
        [string]$Titulo,
        [string]$DirectorioTrabajo,
        [string]$Comando
    )
    $comandoCompleto = "`$Host.UI.RawUI.WindowTitle = '$Titulo'; Set-Location '$DirectorioTrabajo'; $Comando"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $comandoCompleto | Out-Null
}

Write-Host "Levantando Postgres (docker compose)..." -ForegroundColor Cyan
Push-Location $raiz
docker compose up -d
Pop-Location

Write-Host "Abriendo consola: servicio de vision (services/cv)..." -ForegroundColor Cyan
Iniciar-Ventana -Titulo "OCR . services/cv (:8000)" `
    -DirectorioTrabajo (Join-Path $raiz "services\cv") `
    -Comando ".\.venv\Scripts\Activate.ps1; uvicorn app:app --reload --port 8000"

Write-Host "Abriendo consola: API (apps/api)..." -ForegroundColor Cyan
Iniciar-Ventana -Titulo "OCR . apps/api (:6000)" `
    -DirectorioTrabajo (Join-Path $raiz "apps\api") `
    -Comando "npm run dev"

Write-Host "Abriendo consola: Frontend (apps/web)..." -ForegroundColor Cyan
Iniciar-Ventana -Titulo "OCR . apps/web (:5175)" `
    -DirectorioTrabajo (Join-Path $raiz "apps\web") `
    -Comando "npm run dev"

Write-Host ""
Write-Host "Listo. Postgres arriba en segundo plano y 3 ventanas abiertas:" -ForegroundColor Green
Write-Host "  - services/cv  -> http://localhost:8000"
Write-Host "  - apps/api     -> http://localhost:6000/api/salud"
Write-Host "  - apps/web     -> http://localhost:5175"
Write-Host ""
Write-Host "Para detener: cierra las 3 ventanas y corre 'docker compose down' desde la raiz del repo." -ForegroundColor DarkGray
