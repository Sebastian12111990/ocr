<#
Prepara una PC nueva desde cero para levantar el proyecto OCR: contenedores
Docker (Postgres + YOLO), variables de entorno, dependencias npm, y la base
de datos (restaura el backup mas reciente de backups/ si existe, o corre las
migraciones desde cero si no hay ninguno).

No toca nada si ya esta configurado (env existente, DB con tablas) - es
seguro correrlo mas de una vez.

Uso: desde cualquier ubicacion
    powershell -ExecutionPolicy Bypass -File scripts\bootstrap-pc-nueva.ps1
o con doble clic en scripts\bootstrap-pc-nueva.bat
#>

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot

Write-Host "=== 1/8: Variables de entorno ===" -ForegroundColor Cyan
function Asegurar-Env {
    param([string]$Destino, [string]$Ejemplo, [string]$Etiqueta)
    if (-not (Test-Path $Destino)) {
        Copy-Item $Ejemplo $Destino
        Write-Host "Creado $Etiqueta desde .env.example - revisa las rutas antes de seguir." -ForegroundColor Yellow
    } else {
        Write-Host "$Etiqueta ya existe, no se toca." -ForegroundColor DarkGray
    }
}
Asegurar-Env (Join-Path $raiz ".env") (Join-Path $raiz ".env.example") ".env (raiz, docker compose)"
Asegurar-Env (Join-Path $raiz "apps\api\.env.development") (Join-Path $raiz "apps\api\.env.example") "apps\api\.env.development"
Asegurar-Env (Join-Path $raiz "services\cv\.env") (Join-Path $raiz "services\cv\.env.example") "services\cv\.env"

Write-Host "=== 2/8: Levantando Postgres (docker compose) ===" -ForegroundColor Cyan
Push-Location $raiz
docker compose up -d postgres
Pop-Location

Write-Host "=== 3/8: Levantando YOLO (requiere GPU NVIDIA + drivers) ===" -ForegroundColor Cyan
Push-Location $raiz
docker compose up -d yolo
if ($LASTEXITCODE -ne 0) {
    Write-Host "Aviso: el contenedor 'yolo' no arranco (normal si esta PC no tiene GPU NVIDIA). Seguimos sin el." -ForegroundColor Yellow
}
Pop-Location

Write-Host "=== 4/8: Esperando que Postgres este healthy ===" -ForegroundColor Cyan
$listo = $false
for ($i = 0; $i -lt 30; $i++) {
    $estado = docker inspect --format='{{.State.Health.Status}}' ocr-postgres 2>$null
    if ($estado -eq "healthy") { $listo = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $listo) { throw "Postgres no quedo 'healthy' a tiempo. Revisa 'docker compose logs postgres'." }
Write-Host "Postgres listo." -ForegroundColor Green

Write-Host "=== 5/8: Dependencias npm (apps/api, apps/web) ===" -ForegroundColor Cyan
Push-Location (Join-Path $raiz "apps\api")
npm install
Pop-Location
Push-Location (Join-Path $raiz "apps\web")
npm install
Pop-Location

Write-Host "=== 6/8: Dependencias Python (services/cv) ===" -ForegroundColor Cyan
$directorioCv = Join-Path $raiz "services\cv"
$venvCv = Join-Path $directorioCv ".venv"
if (-not (Test-Path $venvCv)) {
    Write-Host "Creando venv en services\cv\.venv..." -ForegroundColor Yellow
    Push-Location $directorioCv
    python -m venv .venv
    .\.venv\Scripts\python.exe -m pip install --upgrade pip
    .\.venv\Scripts\python.exe -m pip install -r requirements.txt
    Pop-Location
} else {
    Write-Host "services\cv\.venv ya existe, no se toca (si cambiaste requirements.txt, instala a mano)." -ForegroundColor DarkGray
}

Write-Host "=== 7/8: Base de datos ===" -ForegroundColor Cyan
$totalTablas = docker exec ocr-postgres psql -U ocr -d ocr -tAc "select count(*) from information_schema.tables where table_schema='public'"
if ([int]($totalTablas.Trim()) -eq 0) {
    $carpetaBackups = Join-Path $raiz "backups"
    $ultimoBackup = Get-ChildItem $carpetaBackups -Filter "*.sql" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if ($ultimoBackup) {
        Write-Host "Restaurando backup mas reciente: $($ultimoBackup.Name)" -ForegroundColor Yellow
        Get-Content $ultimoBackup.FullName | docker exec -i ocr-postgres psql -U ocr -d ocr
        Write-Host "Backup restaurado." -ForegroundColor Green
    } else {
        Write-Host "No hay backups en backups\ - corriendo migraciones desde cero." -ForegroundColor Yellow
        Push-Location (Join-Path $raiz "apps\api")
        npm run db:migrate
        Pop-Location
    }
} else {
    Write-Host "La base ya tiene tablas ($totalTablas) - no se toca (ni migracion ni restore)." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "=== 8/8 Listo ===" -ForegroundColor Green
Write-Host "Pendiente manual:"
Write-Host "  - .env (raiz) y apps\api\.env.development: RUTA_DATASET_YOLO / YOLO_DATASET_DIR deben apuntar a la MISMA ruta en esta PC"
Write-Host "  - Copia la carpeta del dataset (ej. D:\patentes Data Set) a esta PC si todavia no esta"
Write-Host "  - services\cv\.env: DIRECTORIO_IMAGENES (opcional, usa un ejemplo del repo si esta vacio)"
Write-Host "  - services\cv\.env: TESSERACT_CMD debe apuntar al tesseract.exe DE ESTA PC (o quedar vacio si esta en el PATH)"
Write-Host "  - Tesseract-OCR debe estar instalado en el sistema aparte (no lo instala este script): https://github.com/UB-Mannheim/tesseract/wiki"
Write-Host "  - Para el uso diario de ahora en mas: scripts\iniciar-dev.ps1"
