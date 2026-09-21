# SPEC 02 — Servicio YOLO y visualizador de entrenamientos

> **Estado:** Aprobado
> **Depende de:** Ninguna
> **Fecha:** 2026-09-20
> **Objetivo:** Incorporar un servicio de detección de patentes con YOLO (Ultralytics, Docker+GPU) como pipeline nuevo junto al OCR clásico existente, y dar visibilidad en el frontend a las métricas de sus entrenamientos y sondeos.

## Contexto

En un repo aparte (`YOLO/`, fuera de `ocr`) se armó y probó un pipeline de detección de patentes con Ultralytics YOLO corriendo en Docker con GPU (RTX 3060):

- Contenedor `ultralytics/ultralytics` con passthrough de GPU y webcam, verificado end-to-end (detección sobre imagen, webcam en vivo, mini-entrenamiento).
- Sondeo batch sobre las 3964 imágenes de patentes del dataset real (`D:\imagenes - copia`): 88.2% con algún vehículo detectado (modelo COCO genérico).
- Auto-etiquetado con un modelo YOLOv11 preentrenado específico para patentes (`morsetechlab/yolov11-license-plate-detection`, licencia AGPL-3.0): 80.7% de las imágenes etiquetadas automáticamente en formato YOLO, el resto separado para revisión manual (LabelImg).
- Split del dataset en `D:\patentes Data Set\` (`dataset/`, `sin_vehiculo/`, `sin_deteccion/`, `labels/`).

`ocr` hoy no tiene nada de esto: `services/cv` es OpenCV clásico + Tesseract, sin PyTorch ni Docker con GPU, y el frontend es una sola pantalla sin routing ni ninguna vista de métricas. Esta spec formaliza cómo entra el trabajo de YOLO al proyecto real, sin descartar el repo de pruebas hasta confirmar que la migración funciona.

## Alcance

**Incluye:**

- Nuevo servicio `services/yolo/` (Docker + CUDA + Ultralytics), migrando los scripts ya probados (`batch_detect.py`, `auto_label.py`) desde el repo `YOLO/`.
- Servicio `yolo` sumado a `compose.yml` (que hoy solo tiene Postgres), con su reserva de GPU.
- Persistencia en Postgres de los entrenamientos y sondeos ya corridos (no solo los futuros): dos tablas nuevas, `entrenamiento_yolo` y `metrica_epoca`.
- Endpoints en `apps/api` para listar entrenamientos y sus métricas por época, siguiendo el mismo patrón que `features/ejecuciones`.
- Routing en el frontend (no existe hoy — se introduce `react-router`) y una feature nueva `visualizador-entrenamiento` con curvas de loss/mAP por época y tabla de sondeos.

**Fuera de alcance:**

- Reemplazar el pipeline OCR clásico (OpenCV + Tesseract) — YOLO queda como pipeline nuevo y separado, no sustituye al existente en esta spec.
- Completar el etiquetado manual de las imágenes restantes ni entrenar el modelo final de producción.
- Borrar o archivar el repo `YOLO/` standalone — se conserva hasta que el servicio migrado en `ocr` quede verificado.
- Autenticación o control de acceso al nuevo visualizador (hereda lo que ya tenga — o no tenga — el resto de la app).

## Modelo de datos

### `entrenamiento_yolo`

| Campo | Tipo | Uso |
|---|---|---|
| `id` | UUID | Identificador |
| `nombre` | varchar | Ej. `"sondeo-batch-patentes"`, `"finetune-v1"` |
| `tipo` | varchar | `sondeo` \| `auto_etiquetado` \| `entrenamiento` |
| `modelo_base` | varchar | Ej. `yolo11n.pt`, `license-plate-finetune-v1m.pt` |
| `parametros` | JSONB | epochs, batch, imgsz, conf_threshold, etc. |
| `metricas_finales` | JSONB nullable | mAP50, mAP50-95, precision, recall al terminar |
| `total_imagenes` | integer | Imágenes procesadas |
| `imagenes_con_deteccion` | integer nullable | Para sondeos/auto-etiquetado |
| `ruta_pesos` | varchar nullable | Dónde quedó el `.pt` resultante |
| `duracion_ms` | integer | Tiempo total |
| `creado_en` | timestamp | Fecha de la corrida |

### `metrica_epoca`

| Campo | Tipo | Uso |
|---|---|---|
| `id` | UUID | Identificador |
| `entrenamiento_id` | UUID FK | Entrenamiento propietario |
| `epoca` | integer | Número de época |
| `box_loss`, `cls_loss`, `dfl_loss` | real | Curvas de pérdida |
| `map50`, `map50_95` | real nullable | Solo si hubo validación esa época |
| `precision`, `recall` | real nullable | Solo si hubo validación esa época |

Reglas:

- `metrica_epoca` usa borrado en cascada con `entrenamiento_yolo`.
- Un `entrenamiento_yolo` de tipo `sondeo` o `auto_etiquetado` no genera filas en `metrica_epoca` (no tiene épocas) — solo llena `metricas_finales` y los conteos.
- Cada corrida es una fila inmutable, igual que `ejecucion` en la spec 01: no se edita, cada nueva corrida crea un registro nuevo.

## Plan de implementación

1. Crear `services/yolo/` con `Dockerfile` (o reusar imagen `ultralytics/ultralytics` vía compose, como en el repo de pruebas) y migrar `batch_detect.py`, `auto_label.py`, adaptando rutas de entrada/salida al layout de `ocr`.
2. Sumar el servicio `yolo` a `compose.yml`, incluyendo `shm_size`, la reserva de GPU (`driver: nvidia`) y los volúmenes de datos — fusionando con el `compose.yml` actual que solo define Postgres, sin tocar ese servicio.
3. Crear la migración TypeORM que agregue `entrenamiento_yolo` y `metrica_epoca` (mismo mecanismo que las migraciones de la spec 01).
4. Crear las entidades `EntrenamientoYolo` y `MetricaEpoca` con sus relaciones.
5. Escribir un script de carga que tome los resultados ya obtenidos (el sondeo de 3964 imágenes, el auto-etiquetado 80.7%) y los inserte como filas históricas, para que el visualizador tenga datos desde el día uno.
6. Agregar a `apps/api` los endpoints `GET /api/entrenamientos`, `GET /api/entrenamientos/:id`, `GET /api/entrenamientos/:id/metricas`, siguiendo el patrón de capas de `features/ejecuciones`.
7. Introducir `react-router` en `apps/web` (hoy `App.tsx` renderiza directo `EditorPage`) con al menos dos rutas: la pantalla actual del editor y la nueva `/entrenamientos`.
8. Crear la feature `visualizador-entrenamiento` en `apps/web/src/features/` (`types.ts`, `entrenamientoApi.ts` vía RTK Query, `components/`) con: tabla de corridas, gráfico de curvas de loss/mAP por época (librería de charts a definir), y detalle de un sondeo (conteo por clase, % con detección).
9. Verificar: migración aplica limpio, endpoints devuelven los datos históricos cargados, el frontend navega entre editor y visualizador sin romper el estado existente, y el servicio `yolo` levanta con GPU en `docker compose up`.

## Criterios de aceptación

- [ ] `docker compose up` levanta Postgres + `yolo` sin conflictos, con GPU visible dentro del contenedor `yolo`.
- [ ] Los resultados ya obtenidos (sondeo 3964 imágenes, auto-etiquetado) quedan cargados como filas históricas en `entrenamiento_yolo`.
- [ ] `GET /api/entrenamientos` lista las corridas con nombre, tipo, fecha y métricas finales.
- [ ] `GET /api/entrenamientos/:id/metricas` devuelve las filas de `metrica_epoca` ordenadas por época (vacío para sondeos/auto-etiquetado).
- [ ] El frontend tiene una ruta `/entrenamientos` accesible sin romper la pantalla del editor existente.
- [ ] El visualizador muestra al menos: tabla de corridas + un gráfico de curvas por época para el entrenamiento que sí tiene épocas (el mini-entrenamiento coco128).
- [ ] API y frontend compilan sin errores.
- [ ] El repo `YOLO/` standalone sigue intacto — nada de esta spec lo borra.

## Decisiones

| Decisión | Motivo |
|---|---|
| Servicio `services/yolo/` separado de `services/cv/` | `cv` es liviano (OpenCV+Tesseract, `.venv` nativo); YOLO necesita Docker+CUDA+modelos pesados. Separarlos evita que quien no tiene GPU deba levantar el servicio pesado para usar el editor OCR actual. |
| YOLO no reemplaza el pipeline OCR existente | El pipeline OpenCV+Tesseract ya funciona y tiene su propia spec (01); esta spec suma capacidad, no reemplaza. |
| Cargar datos históricos en vez de arrancar de cero | El sondeo y auto-etiquetado ya se corrieron y tienen valor — repetirlos solo para tener datos en Postgres sería desperdiciar 2 corridas reales. |
| Tabla `metrica_epoca` separada de `entrenamiento_yolo` | Sondeos y auto-etiquetado no tienen épocas; forzarlo a una sola tabla dejaría columnas vacías la mayoría del tiempo. |
| No borrar el repo `YOLO/` en esta spec | Es reversible mantenerlo y no lo es borrarlo antes de confirmar que todo corre igual dentro de `ocr`. |
| Introducir routing recién ahora | Hasta esta spec el frontend nunca necesitó más de una pantalla; agregar una segunda vista es el disparador natural. |

Alternativas descartadas:

- Extender `services/cv` en lugar de crear `services/yolo` — se descartó por mezclar un stack liviano (sin Docker) con uno que exige Docker+CUDA siempre.
- Reemplazar el pipeline OCR actual por YOLO directamente — prematuro sin el modelo final entrenado y validado.
- Omitir la carga de datos históricos y arrancar el visualizador vacío — pierde el valor de las corridas ya hechas.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Máquina sin GPU no puede levantar `services/yolo` | Servicio separado y opcional en `compose.yml`; el resto de la app sigue funcionando sin él. |
| Migración de datos históricos con formato inconsistente (CSV del sondeo, `.txt` YOLO del auto-etiquetado) | Script de carga dedicado (paso 5) que normaliza antes de insertar, corrido una sola vez. |
| Introducir `react-router` rompe el estado/behaviour actual del editor | Verificar explícitamente en el criterio de aceptación que la pantalla del editor sigue intacta tras el cambio. |
| Licencia AGPL-3.0 del modelo `morsetechlab/yolov11-license-plate-detection` | Documentado ya en el repo de pruebas; si `ocr` se convierte en producto/servicio de red, revisar implicancias antes de esa etapa — no bloquea esta spec. |

## Lo que no incluye esta especificación

- Reemplazo del pipeline OCR clásico.
- Entrenamiento del modelo final de producción ni etiquetado manual completo del dataset.
- Eliminación del repo `YOLO/` standalone.
- Autenticación, permisos o multiusuario en el visualizador.
- Comparación automática entre corridas o alertas sobre degradación de métricas.
