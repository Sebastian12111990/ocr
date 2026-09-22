<#
Chequea el espacio libre en el disco donde vive YOLO_IMAGENES_DIR (definido en
.env, en la raiz del repo) y avisa si baja de un umbral. El consumo de disco de
las capturas de camaras escala con la cantidad de lineas/camaras de cada
planta, no es un numero fijo - por eso conviene chequear de vez en cuando en
lugar de asumir que siempre va a alcanzar.

No borra ni mueve nada - solo informa.

Uso: desde cualquier ubicacion
    powershell -ExecutionPolicy Bypass -File scripts\verificar-espacio.ps1
    powershell -ExecutionPolicy Bypass -File scripts\verificar-espacio.ps1 -UmbralGB 100
#>
param(
    [int]$UmbralGB = 50
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $raiz ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "No existe .env en la raiz del repo - copia .env.example primero." -ForegroundColor Yellow
    exit 1
}

$linea = Get-Content $envPath | Where-Object { $_ -match '^YOLO_IMAGENES_DIR=' } | Select-Object -First 1
if (-not $linea) {
    Write-Host "YOLO_IMAGENES_DIR no esta definida en .env" -ForegroundColor Yellow
    exit 1
}

$ruta = ($linea -split '=', 2)[1].Trim()
$letra = $ruta.Substring(0, 1)

$disco = Get-PSDrive -Name $letra -ErrorAction Stop
$libreGB = [math]::Round($disco.Free / 1GB, 1)
$totalGB = [math]::Round(($disco.Free + $disco.Used) / 1GB, 1)
$pctLibre = [math]::Round(100 * $disco.Free / ($disco.Free + $disco.Used), 1)

Write-Host "Disco ${letra}: (YOLO_IMAGENES_DIR=$ruta)" -ForegroundColor Cyan
Write-Host "  $libreGB GB libres de $totalGB GB ($pctLibre% libre)"

if ($libreGB -lt $UmbralGB) {
    Write-Host ""
    Write-Host "AVISO: quedan menos de $UmbralGB GB libres." -ForegroundColor Red
    Write-Host "Las capturas siguen creciendo con cada planta/linea nueva - revisa si hay" -ForegroundColor Red
    Write-Host "que archivar o purgar algo antes de la proxima descarga grande." -ForegroundColor Red
    exit 2
} else {
    Write-Host "OK, por encima del umbral de $UmbralGB GB." -ForegroundColor Green
}
