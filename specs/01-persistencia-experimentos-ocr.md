# SPEC 01 — Persistencia y carga de experimentos OCR

> **Estado:** Aprobado
> **Depende de:** Ninguna
> **Fecha:** 2026-08-26
> **Objetivo:** Guardar y restaurar ejecuciones OCR reproducibles con su pipeline ordenado, imagen procesada y candidatos válidos.

## Alcance

**Incluye:**

- Guardar manualmente una nueva `ejecucion` cuando OCR y candidatos estén actualizados.
- Exigir al menos un candidato con coincidencia `≥20%`.
- Guardar únicamente candidatos con coincidencia `≥20%`.
- Persistir modo, orden, repeticiones, estado y parámetros de todas las etapas.
- Guardar resultado OCR, estadísticas, imagen procesada y recortes PNG.
- Invalidar resultados cuando cambie el pipeline.
- Vaciar resultados cuando cambie la patente.
- Cargar una ejecución desde un selector junto a “Patente”, sin reprocesar.
- Mostrar junto al título la fecha y mejor coincidencia de una ejecución cargada.
- Eliminar de la pantalla el guardado de presets por nombre.

**Fuera de alcance:**

- Ejecutar OCR o candidatos automáticamente al guardar.
- Guardar candidatos con coincidencia inferior al `20%`.
- Eliminar, modificar o sobrescribir ejecuciones históricas.
- Migrar o eliminar la tabla `preset` existente.

## Modelo de datos

### `ejecucion`

| Campo | Tipo | Uso |
|---|---|---|
| `id` | UUID | Identificador histórico |
| `imagen_id` | UUID FK | Patente procesada |
| `modo` | varchar | `fijo` o `libre` |
| `pipeline_version` | integer | Versión del contrato |
| `etapas` | JSONB | Arreglo ordenado de algoritmos y parámetros |
| `patente_esperada` | varchar | Valor esperado al guardar |
| `texto_detectado` | varchar nullable | Resultado OCR general |
| `confianza` | real nullable | Confianza OCR general |
| `acierto` | boolean | Coincidencia exacta general |
| `distancia_edicion` | integer nullable | Distancia Levenshtein |
| `duracion_ms` | integer | Tiempo del OCR |
| `mejor_coincidencia` | real | Mayor coincidencia entre candidatos |
| `imagen_procesada_png` | bytea | Vista final exacta |
| `creado_en` | timestamp | Fecha del experimento |

`etapas` conserva orden y repeticiones:

```json
[
  {
    "tipo": "redimensionar",
    "activa": true,
    "parametros": { "factor": 1.8 }
  },
  {
    "tipo": "rectangulos",
    "activa": true,
    "parametros": { "area_minima": 1000 }
  }
]
```

### `candidato_ejecucion`

| Campo | Tipo | Uso |
|---|---|---|
| `id` | UUID | Identificador |
| `ejecucion_id` | UUID FK | Ejecución propietaria |
| `orden` | integer | Posición original |
| `x`, `y` | integer | Origen de la caja |
| `ancho`, `alto` | integer | Dimensiones |
| `angulo` | real | Inclinación |
| `area` | real | Área detectada |
| `texto` | varchar | Lectura Tesseract |
| `confianza` | real nullable | Confianza OCR |
| `coincidencia` | real | Similitud con la patente |
| `imagen_png` | bytea | Recorte histórico |

Reglas:

- `candidato_ejecucion` usa borrado en cascada con `ejecucion`.
- `coincidencia` debe ser `≥20`.
- Cada ejecución y su tasa de coincidencia son inmutables.
- La configuración guardada es un snapshot y nunca se actualiza.
- El frontend conserva una huella del pipeline usado para OCR y candidatos; cualquier cambio invalida ambos resultados.

## Plan de implementación

1. Crear una migración que amplíe `ejecucion` y agregue `candidato_ejecucion`.
2. Crear la entidad `CandidatoEjecucion` y sus relaciones TypeORM.
3. Agregar a la API una operación transaccional para guardar la ejecución y candidatos `≥20%`.
4. Ampliar `GET /api/ejecuciones` y agregar el detalle necesario para restaurar una ejecución.
5. Incorporar en el frontend el estado de validez de OCR y candidatos, invalidándolo al cambiar pipeline o patente.
6. Reemplazar el guardado de presets por el botón manual “Guardar ejecución”, habilitado solo cuando se cumplan las validaciones.
7. Agregar el selector de ejecuciones junto a “Patente” y restaurar imagen, pipeline, resultados y candidatos sin reprocesar.
8. Mostrar en el encabezado la fecha y mejor coincidencia cuando se visualice una ejecución de BD.
9. Verificar migración, API, modo fijo, modo libre, algoritmos repetidos, recarga histórica y restricciones de guardado.

## Criterios de aceptación

- [ ] Cambiar la patente vacía OCR, candidatos y ejecución cargada.
- [ ] Cambiar cualquier etapa o parámetro invalida OCR y candidatos.
- [ ] “Guardar ejecución” no ejecuta CV ni OCR.
- [ ] El botón permanece deshabilitado hasta ejecutar manualmente OCR y candidatos.
- [ ] El botón permanece deshabilitado si ningún candidato alcanza `20%`.
- [ ] Solo se guardan candidatos con coincidencia `≥20%`.
- [ ] Cada guardado crea una ejecución nueva e inmutable.
- [ ] No existen operaciones de edición de resultados guardados.
- [ ] El modo libre conserva orden, repeticiones y parámetros.
- [ ] El modo fijo conserva etapas, estados y parámetros.
- [ ] La imagen procesada y los recortes se almacenan como PNG.
- [ ] El selector lista ejecuciones por fecha, modo y mejor coincidencia.
- [ ] Cargar una ejecución no realiza solicitudes de procesamiento u OCR.
- [ ] Cargar restaura patente, pipeline, imagen, OCR y candidatos.
- [ ] El encabezado muestra fecha y mejor coincidencia de la ejecución cargada.
- [ ] El campo “Nombre del preset” deja de aparecer.
- [ ] API y frontend compilan sin errores.

## Decisiones

| Decisión | Motivo |
|---|---|
| Ampliar `ejecucion` en lugar de crear `experimento` | Evita duplicar un concepto existente |
| Crear `candidato_ejecucion` | Permite estadísticas y recortes por candidato |
| Guardado exclusivamente manual | El usuario controla cuándo una prueba es relevante |
| No reprocesar al guardar o cargar | Conserva exactamente el resultado observado |
| Guardar solo candidatos `≥20%` | Descarta lecturas sin utilidad experimental |
| Guardar el pipeline como JSONB ordenado | Conserva orden, repeticiones y parámetros |
| Guardar PNG en `bytea` | Mantiene snapshots independientes del sistema de archivos |
| Crear una fila inmutable por guardado | Conserva el historial absoluto de pruebas |
| No solicitar nombre | Fecha, modo y coincidencia identifican la ejecución |
| Mantener `preset` fuera del nuevo flujo | Evita una migración destructiva innecesaria |

Alternativas descartadas:

- Guardar todos los candidatos.
- Sobrescribir o editar ejecuciones anteriores.
- Regenerar imágenes y candidatos al cargar.
- Ejecutar OCR automáticamente al guardar.
- Usar Base64 dentro de JSONB para las imágenes.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Crecimiento de PostgreSQL por los PNG | Comprimir como PNG y guardar solo candidatos `≥20%` |
| Resultados asociados a un pipeline modificado | Invalidar OCR y candidatos ante cualquier cambio |
| Cambios futuros en algoritmos CV | Guardar `pipeline_version` y el snapshot visual |
| Ejecuciones incompletas por fallos parciales | Guardar ejecución y candidatos en una transacción |
| Opciones antiguas incompatibles con el catálogo actual | Validar etapas al cargar y mostrar un error explícito |

## Lo que no incluye esta especificación

- Eliminación de ejecuciones históricas.
- Edición o sobrescritura de resultados guardados.
- Ejecución automática de OCR o candidatos.
- Persistencia de candidatos con coincidencia inferior al `20%`.
- Eliminación o migración de la tabla `preset`.
- Comparación gráfica entre múltiples ejecuciones.
- Exportación de resultados a CSV, Excel o PDF.

Cada ejecución y su tasa de coincidencia son resultados absolutos e inmutables. Una nueva prueba siempre crea otra fila en `ejecucion`.
