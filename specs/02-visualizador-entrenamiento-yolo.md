# SPEC 02 — Visualizador de entrenamiento YOLO

> **Estado:** Aprobado
> **Depende de:** Ninguna
> **Fecha:** 2026-09-20
> **Objetivo:** Migrar el trabajo de detección de patentes hecho en el repo standalone `YOLO` (Docker + Ultralytics) al proyecto `ocr`, reutilizando su frontend y backend, y agregar un visualizador histórico de las corridas de sondeo/auto-etiquetado/entrenamiento.

## Alcance

**Incluye:**

- Migrar los scripts Python de detección (`batch_detect.py`, `auto_label.py`) a `services/yolo/`, como un servicio Docker más dentro de `compose.yml`, separado de `services/cv`.
- Registrar en Postgres el historial de corridas de YOLO: sondeos batch, pases de auto-etiquetado, y entrenamientos con métricas por época.
- Backfill único de las 3 corridas reales ya ejecutadas antes de que existiera esta tabla.
- Exponer el historial vía API REST de solo lectura (`/api/entrenamientos`).
- Agregar una vista en el frontend que liste las corridas, permita filtrarlas por tipo, y grafique las métricas por época (box/cls/dfl loss, mAP50, mAP50-95) de los entrenamientos reales.
- Agregar una barra lateral de navegación (Editor / Entrenamientos con submenú por tipo) para acceder a la nueva vista sin perder el editor OCR existente.
- Mezclar los `docker-compose.yml` de ambos repos en un único `compose.yml` en la raíz de `ocr`.

**Fuera de alcance:**

- Eliminar el repo standalone `YOLO` (queda como red de seguridad hasta verificar que todo funcione migrado).
- Disparar entrenamientos o sondeos nuevos desde la API o el frontend — esta spec es de solo lectura sobre corridas ya ejecutadas.
- Resolver la ambigüedad de clasificación de tipo de vehículo (car/truck) detectada durante el sondeo — queda pendiente, documentada pero no resuelta.
- Cualquier flujo de revisión/clasificación manual del dataset de imágenes (eso se abordó después, como extensión orgánica, no estaba planeado en esta spec).

## Modelo de datos

### `entrenamiento_yolo`

| Campo | Tipo | Uso |
|---|---|---|
| `id` | UUID | Identificador histórico |
| `nombre` | varchar | Nombre descriptivo de la corrida |
| `tipo` | varchar | `sondeo`, `auto_etiquetado` o `entrenamiento` |
| `modelo_base` | varchar | Modelo YOLO usado (ej. `yolo11n.pt`) |
| `parametros` | JSONB | Parámetros de la corrida (fuente, umbrales, hiperparámetros) |
| `metricas_finales` | JSONB nullable | `{ map50, map50_95, precision, recall }` — solo entrenamientos |
| `total_imagenes` | integer | Imágenes procesadas |
| `imagenes_con_deteccion` | integer nullable | Imágenes con al menos una detección |
| `ruta_pesos` | varchar nullable | Ruta a los pesos resultantes, si aplica |
| `duracion_ms` | integer | Duración total de la corrida |
| `creado_en` | timestamptz | Fecha de la corrida |

### `metrica_epoca`

| Campo | Tipo | Uso |
|---|---|---|
| `id` | UUID | Identificador |
| `entrenamiento_id` | UUID FK | Entrenamiento propietario (cascada) |
| `epoca` | integer | Número de época, único por entrenamiento |
| `box_loss`, `cls_loss`, `dfl_loss` | real | Pérdidas reportadas por Ultralytics |
| `map50`, `map50_95` | real nullable | Métricas de precisión de detección |
| `precision`, `recall` | real nullable | Métricas estándar |

Reglas:

- `entrenamiento_yolo` y `metrica_epoca` son filas inmutables, igual que `ejecucion` en la spec 01 — no se editan, solo se insertan.
- `metrica_epoca` usa borrado en cascada con `entrenamiento_yolo`.
- Solo las corridas `tipo = 'entrenamiento'` tienen filas en `metrica_epoca` y `metricas_finales`.

## Plan de implementación

1. Escribir esta spec y aprobarla antes de tocar código (convención del repo).
2. Crear la migración que agrega `entrenamiento_yolo` y `metrica_epoca`.
3. Crear las entidades TypeORM y el feature `entrenamientos` (service/controller/routes de solo lectura).
4. Escribir el script de backfill (`scripts/cargar-historico-yolo.ts`) con los datos reales de las 3 corridas ya ejecutadas.
5. Migrar `batch_detect.py` y `auto_label.py` a `services/yolo/`, agregar el servicio `yolo` a `compose.yml` con GPU passthrough.
6. Construir el frontend: sidebar con Editor/Entrenamientos, página de listado filtrable, gráfico de métricas por época con Recharts.
7. Verificar migración, seed, API y frontend end-to-end contra datos reales (no placeholders).

## Criterios de aceptación

- [x] La migración crea ambas tablas con sus constraints e índices.
- [x] El backfill carga las 3 corridas reales con sus métricas exactas, sin duplicar si se corre dos veces.
- [x] `GET /api/entrenamientos` lista las corridas ordenadas por fecha descendente.
- [x] `GET /api/entrenamientos/:id` devuelve el detalle con parámetros y ruta de pesos.
- [x] `GET /api/entrenamientos/:id/metricas` devuelve las métricas por época ordenadas.
- [x] El sidebar permite navegar entre Editor y Entrenamientos sin recargar la página.
- [x] El submenú de Entrenamientos filtra por tipo (sondeo/auto_etiquetado/entrenamiento).
- [x] El gráfico de métricas se ve solo para corridas de tipo `entrenamiento`.
- [x] El servicio `yolo` en `compose.yml` monta las mismas rutas de datos que el repo standalone.
- [x] API y frontend compilan sin errores.
- [x] El repo standalone `YOLO` queda intacto y sin tocar.

## Decisiones

| Decisión | Motivo |
|---|---|
| Tabla única `entrenamiento_yolo` con `tipo` en vez de 3 tablas separadas | Sondeo, auto-etiquetado y entrenamiento comparten casi todos los campos |
| `metrica_epoca` en tabla aparte, no JSONB dentro de `entrenamiento_yolo` | Permite graficar y ordenar por época sin parsear JSON en el cliente |
| `services/yolo` separado de `services/cv` | Son responsabilidades distintas (detección YOLO vs OCR clásico); no forzar un monolito |
| Backfill manual con datos reales capturados, no sintéticos | El objetivo es visualizar lo que realmente pasó, no una demo |
| Mezclar `compose.yml` en uno solo en la raíz | El usuario pidió explícitamente no mantener dos `docker-compose.yml` separados |
| No borrar el repo `YOLO` en esta spec | Red de seguridad hasta confirmar que la migración funciona igual o mejor |

Alternativas descartadas:

- Mantener el repo `YOLO` como submódulo git — se descartó por complejidad innecesaria para un solo desarrollador.
- Graficar métricas del lado del cliente sin persistirlas — se descartó porque los logs de Ultralytics no persisten entre reinicios del contenedor.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Modelo de patentes (`license-plate-finetune-v1m.pt`) es AGPL-3.0 | Documentado explícitamente; si el proyecto se expone como servicio de red, hay que revisar obligaciones de la licencia antes de producción |
| `runs_dir` de Ultralytics se resetea al recrear el contenedor | Ya resuelto en el repo standalone (documentado en su README); se migra el mismo volumen |
| Migración de dos `docker-compose.yml` a uno puede romper rutas relativas | Se usan rutas absolutas configurables por variable de entorno (`YOLO_IMAGENES_DIR`, `YOLO_DATASET_DIR`) |

## Lo que no incluye esta especificación

- Disparo de entrenamientos o sondeos nuevos desde la UI.
- Edición o eliminación de corridas históricas.
- Clasificación manual de imágenes del dataset (sondeos con/sin patente, casos difíciles) — se construyó después como extensión no planificada aquí.
- Resolución de la ambigüedad car/truck del sondeo COCO.
- Eliminación del repo standalone `YOLO`.

Cada corrida es un resultado absoluto e inmutable, igual que las ejecuciones OCR de la spec 01. Un nuevo sondeo o entrenamiento siempre crea una fila nueva en `entrenamiento_yolo`.
