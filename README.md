# Editor OCR de patentes

Editor web para preparar fotos de patentes chilenas con filtros de OpenCV encadenados y ejecutar OCR
(Tesseract) sobre el resultado.

## Estructura

```
computer vision/   Scripts Python originales (intactos). Fuente de los algoritmos y de patentes/.
apps/api/          Node + TypeScript + Inversify + TypeORM + Express        (puerto 4000)
apps/web/          Vite + React 19 + MUI 9                                   (puerto 5175)
services/cv/       FastAPI + OpenCV + pytesseract                            (puerto 8000)
compose.yml        PostgreSQL
scripts/           Scripts de desarrollo (levantar todo con un comando)
```

## Inicio rápido (Windows)

Con Docker Desktop abierto y las dependencias ya instaladas una vez (`npm install`
en `apps/api` y `apps/web`, `pip install -r requirements.txt` en `services/cv`):

```powershell
scripts\iniciar-dev.ps1
```

o doble clic en `scripts\iniciar-dev.bat`. Levanta Postgres en segundo plano y
abre una ventana de consola por servicio (services/cv, apps/api, apps/web) para
ver sus logs por separado. Para detener: cerrar las 3 ventanas y correr
`docker compose down`.

## Cómo levantar todo a mano (primera vez / depuración)

1. **Base de datos**
   ```bash
   docker compose up -d
   ```
2. **Servicio de visión (Python)**
   ```bash
   cd services/cv
   python -m venv .venv
   .venv/Scripts/activate       # Windows
   pip install -r requirements.txt
   uvicorn app:app --reload --port 8000
   ```
   Requiere **Tesseract OCR** instalado en el sistema (no viene con `pip install pytesseract`):
   `winget install UB-Mannheim.TesseractOCR`.
3. **API**
   ```bash
   cd apps/api
   npm install
   npm run db:migrate
   npm run dev
   ```
4. **Frontend**
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```
   Abrir http://localhost:5175
