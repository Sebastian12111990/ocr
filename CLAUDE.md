# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es esto

Editor web para preparar fotos de patentes chilenas con filtros de OpenCV encadenados y ejecutar OCR
(Tesseract) sobre el resultado, con persistencia de experimentos (ejecuciones, candidatos) y un
módulo de entrenamiento/dataset YOLO. Todo el código de dominio, identificadores y comentarios están
en **español**; mantener esa convención en código nuevo.

## Estructura

```
computer vision/   Scripts Python originales e intactos (fuente de los algoritmos de OpenCV y de computer vision/patentes/)
apps/api/          Node + TypeScript + Inversify + TypeORM + Express        (puerto 6000)
apps/web/          Vite + React 19 + MUI 9 + Redux Toolkit (RTK Query)      (puerto 5175)
services/cv/       FastAPI + OpenCV + pytesseract                          (puerto 8000)
services/yolo/     Script suelto (detectar.py) que corre dentro del contenedor `yolo`
compose.yml        Postgres + contenedor `yolo` (ultralytics/ultralytics, requiere GPU NVIDIA)
scripts/           Arranque de todo el entorno de desarrollo (Windows)
specs/             Specs de features aprobadas (formato: Estado/Depende de/Objetivo/Alcance/Modelo de datos)
docs/              Documentos de decisión y diseño (el qué y el por qué; no reemplazan las specs)
```

## Comandos

### Arrancar todo (Windows)
```bat
scripts\iniciar-dev.cmd
```
Levanta Postgres (`docker compose up -d`) y abre 3 ventanas de consola (services/cv, apps/api, apps/web).
Para detener: cerrar las ventanas y `docker compose down`.

Para una PC nueva (instala deps, crea `.env`, restaura backup o migra desde cero):
```powershell
powershell -ExecutionPolicy Bypass -File scripts\bootstrap-pc-nueva.ps1
```

### apps/api (raíz `apps/api/`)
```bash
npm run dev              # tsx watch, puerto 6000, usa .env.development
npm run build             # tsc
npm run typecheck         # tsc --noEmit
npm run db:migrate        # aplica migraciones TypeORM (src/migraciones/)
npm run db:revert         # revierte la última migración
npm run db:seed           # src/infraestructura/seed.ts
npm run seed:yolo         # carga histórico de entrenamientos YOLO
npm run indexar:dataset   # escanea RUTA_IMAGENES_DATASET -> tabla imagen_dataset
npm run cargar:detecciones -- <csv> [--reemplazar]  # CSV de services/yolo/detectar.py -> deteccion_imagen
npm run verify:stack      # scripts/verificar-stack.ts
npm run verify:ejecuciones
```
No hay test runner configurado (no hay `npm test`).

### apps/web (raíz `apps/web/`)
```bash
npm run dev         # vite --port 5175, proxy /api -> localhost:6000
npm run build        # tsc -b && vite build
npm run typecheck    # tsc --noEmit
```
No hay test runner configurado.

### services/cv (raíz `services/cv/`, requiere venv activado)
```bash
uvicorn app:app --reload --port 8000
```
Requiere **Tesseract OCR** instalado en el sistema (`winget install UB-Mannheim.TesseractOCR`);
configurable vía `TESSERACT_CMD` en `services/cv/.env` si no está en el PATH.

### Base de datos
- `docker compose up -d postgres` (o `up -d` para todo, incluyendo `yolo` si hay GPU y `.env` con las rutas del dataset).
- Backups van en `backups/*.sql` (gitignored, contienen patentes reales) — `bootstrap-pc-nueva.ps1` restaura el más reciente si existe, o corre `db:migrate` si no hay ninguno.
- Restaurar un dump a mano: `docker exec -i ocr-postgres psql -U ocr -d ocr < archivo.sql`.

## Arquitectura

### apps/api — features + Inversify
Organizado por *feature* (`src/features/<nombre>/`), cada uno con `*.controller.ts`, `*.routes.ts`,
`*.service.ts`, `*.types.ts` y, si persiste, un `*.entidad.ts` (entidad TypeORM). Los repos de TypeORM
y todos los servicios/controladores se registran como singletons en `src/contenedor/contenedor.ts`
usando claves de `src/contenedor/tipos.ts` (`TIPOS`); las rutas reciben el `Container` y resuelven
sus dependencias ahí (`crearRutasX(contenedor)`), no hay decoradores de ruta automáticos. `src/app.ts`
monta todos los routers bajo `/api/<feature>` y expone `GET /api/salud` (chequea BD + servicio CV).
Entorno validado con Zod en `src/config/env.ts` (falla rápido si faltan variables).

Migraciones TypeORM en `src/migraciones/`, corridas con un CLI propio
(`src/infraestructura/cli-migraciones.ts`), no con el CLI estándar de TypeORM.

`src/infraestructura/cliente-cv.ts` es el único punto de contacto con `services/cv` (HTTP); nunca lo
llama el navegador directamente — todo pasa por `apps/api`, que traduce códigos de error del servicio
de visión (400/404/503 se propagan, el resto se mapea a 502 `ErrorServicioExterno`).

### apps/web — features + RTK Query
Mismo patrón por feature en `src/features/<nombre>/` (`*Api.ts` con `apiSlice.injectEndpoints`,
`*.types.ts`, `components/`, a veces `pages/`). `src/app/store/apiSlice.ts` es el slice RTK Query base
sin endpoints propios — cada feature inyecta los suyos. Rutas de la app en `src/app/App.tsx`
(react-router-dom v7): `/` editor, `/entrenamientos`, `/dataset`. Alias `@/` → `src/` (configurado en
`vite.config.ts` y `tsconfig.json`, deben mantenerse sincronizados). Vite proxea `/api` a
`localhost:6000` en dev.

### services/cv — pipeline de OpenCV por etapas
`dominio/catalogo.py` define el catálogo de "etapas" disponibles (tipo, parámetros, canales de
entrada/salida esperados). `dominio/pipeline.py` ejecuta un array ordenado de etapas normalizando
canales (gris/color) antes y después de cada una, para que el pipeline nunca falle por
incompatibilidad de canales sin importar el orden en que el usuario las encadene (ver comentario en
ese archivo — "problema de canales"). Los handlers HTTP en `api/rutas.py` son `def` (no `async def`)
a propósito: OpenCV libera el GIL, así que FastAPI los corre en threadpool con paralelismo real; un
`async def` con cv2 adentro serializaría las peticiones (crítico porque el debounce del frontend
genera varias por segundo).

`/candidatos` reconstruye el pipeline hasta la última etapa `rectangulos` activa (evita detectar sobre
sus propias marcas verdes) y fusiona sus parámetros con `parametros_deteccion` de la solicitud.

Config en `config.py`: `DIRECTORIO_IMAGENES` por defecto apunta a `computer vision/patentes` dentro
del repo; override con `.env` local (`services/cv/.env`, no versionado).

### Contenedor `yolo`
Requiere GPU NVIDIA (`deploy.reservations.devices driver: nvidia`) y una ruta host montada de solo
lectura (`YOLO_IMAGENES_DIR` → `/data/patentes`), configurable en `.env` en la raíz (ver
`.env.example`). Debe ser la misma ruta que `RUTA_IMAGENES_DATASET` en `apps/api/.env.development`:
un lado lo monta Docker dentro del contenedor, el otro lo lee `apps/api` directo del disco del host —
si difieren, cada uno ve un dataset distinto. `working_dir` del contenedor es `services/yolo/`
(`detectar.py`, se ejecuta a mano dentro del contenedor con `docker exec`). Ojo al pasarle `source` a
`model.predict(...)`: si se le da un directorio, Ultralytics lo globea **sin recursividad** — con la
estructura `<planta>/<año>/<mes>/<día>/` hay que pasarle la lista de archivos ya resuelta (`rglob`),
no el path del directorio, o no encuentra ninguna imagen.

## Estado del módulo dataset/YOLO

Implementado el rediseño que describe `docs/decisiones-modelo-dataset.md` (2026-09-21): el disco
guarda solo la imagen y su procedencia (derivada de la ruta `<planta>/<año>/<mes>/<día>/archivo`);
detecciones y juicio humano viven en Postgres, en `imagen_dataset`, `tipo_etiqueta`,
`etiqueta_imagen` y `deteccion_imagen` (migración `1789800000000-InventarioDataset.ts`). Ya no
existen las carpetas físicas `dataset/`, `sin_vehiculo/`, `sin_deteccion/` ni `procedencia_imagen`/
`clasificacion_imagen_dataset` (esta última se dejó en la BD sin usar hasta confirmar que ninguna PC
tiene datos ahí — dropearla en una migración aparte).

Flujo para cargar un dataset nuevo:
1. `npm run indexar:dataset` (`apps/api`) — escanea `RUTA_IMAGENES_DATASET` y puebla `imagen_dataset`.
   Idempotente, lee dimensiones por contenido de archivo (no por extensión — ver aviso abajo).
2. `docker exec -it ocr-yolo python detectar.py <modelo.pt> [--clases car,truck,bus,motorcycle]
   [--clase-como patente]` — genera `services/yolo/runs/detecciones-<modelo>.csv`.
3. `npm run cargar:detecciones -- ../../services/yolo/runs/detecciones-<modelo>.csv [--reemplazar]`
   (`apps/api`) — cada modelo es una versión de la capa "detección"; `--reemplazar` se niega si alguna
   fila de ese modelo ya tiene `veredicto` humano cargado.
4. Revisión humana en `/dataset` (`DatasetPage.tsx`): las 5 "vistas" (`todas`, `con_patente`,
   `vehiculo_sin_patente`, `sin_vehiculo_con_patente`, `sin_deteccion`) se calculan con `EXISTS` sobre
   `deteccion_imagen`, no leyendo carpetas. Etiquetar (`etiqueta_imagen`, toggle idempotente) y marcar
   veredicto de una caja (`deteccion_imagen.veredicto`) invalida solo esa imagen vía RTK Query tags.
   `/resumen` acepta los mismos filtros (`planta`/`fechaDesde`/`fechaHasta`/`etiqueta`) que
   `/imagenes` — las pestañas cuentan sobre el filtro activo, no siempre sobre todo el dataset.

Los pasos 2-3 también se pueden disparar **desde la vista** (`PanelProcesamiento.tsx`): elegís
planta + rango de fechas (máximo un mes) y "Procesar" dispara
`ServicioProcesamientoDataset.iniciarProcesamiento` (`apps/api/src/features/dataset/
procesamiento-dataset.service.ts`) — un job en memoria (un solo usuario, un job a la vez) que
hace `child_process.spawn("docker", ["exec", "ocr-yolo", ...])` con `detectar.py --lista
<archivo>` (no `--limit`; la lista sale de `imagen_dataset` filtrado por planta/fecha), carga el
CSV resultante vía `ServicioDataset.cargarDetecciones` y registra la corrida como fila en
`entrenamiento_yolo` (`tipo: "sondeo"`, `parametros.origen: "ui_bajo_demanda"`). El frontend
pollea `GET /api/dataset/procesos/actual` cada 2s mientras hay un job activo. `cargarDetecciones`
con `reemplazar: true` borra solo `deteccion_imagen` de las imágenes presentes en ese CSV, nunca
todo el modelo — reprocesar una planta/rango no debe tocar detecciones de otras ya cargadas con el
mismo modelo (bug real que tenía el script original, corregido acá).

**Aviso verificado en la PC de trabajo (no es un bug de este repo):** el servidor de cámaras sirve
PNG dentro de una carpeta literal `JPG/`, con extensión `.JPG` — el contenido no es JPEG real. `cv2`/
`PIL`/Ultralytics lo toleran (leen por contenido), y `indexar-dataset.ts` también (detecta PNG vs
JPEG por magic bytes al leer ancho/alto, no confía en la extensión).

Pendiente para una siguiente iteración (fuera de esta implementación): export efímero
`images/train`+`labels/train` con hardlinks para entrenar (Ultralytics exige carpetas físicas),
`capturado_en` (la hora de captura se pierde en `download.js`, todavía recuperable vía
`Last-Modified` del servidor), y migrar `clasificacion_imagen_dataset` si tiene datos en alguna PC.

## Convenciones propias del repo

- Todo en español: nombres de tablas/columnas, carpetas de features, variables, comentarios.
- Comentarios solo quedan cuando explican un motivo no obvio (ver ejemplos arriba: problema de
  canales, `def` vs `async def`, reconstrucción del pipeline en `/candidatos`) — no hay docstrings
  descriptivos de "qué hace" la función.
- Las specs en `specs/*.md` son la fuente de verdad del modelo de datos y alcance de cada feature
  grande; revisar la spec correspondiente antes de tocar `ejecuciones`, `candidatos` o
  `entrenamientos`/`dataset`.
