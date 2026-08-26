# Editor OCR de patentes

Editor web para preparar fotos de patentes chilenas con filtros de OpenCV encadenados y ejecutar OCR
(Tesseract) sobre el resultado.

## Estructura

```
computer vision/   Scripts Python originales (intactos). Fuente de los algoritmos y de patentes/.
apps/api/          Node + TypeScript + Inversify + TypeORM + Express        (puerto 4000)
apps/web/          Vite + React 19 + MUI 7                                   (puerto 5175)
services/cv/       FastAPI + OpenCV + pytesseract                            (puerto 8000)
compose.yml        PostgreSQL
```

## Cómo levantar todo (desarrollo)

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
