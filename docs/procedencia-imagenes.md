# Procedencia de imágenes (planta + fecha)

## Qué es

Cada imagen del dataset puede venir de una **planta** distinta, capturada en una **fecha**
distinta. Eso importa porque el ambiente, el clima y el contexto del lugar varían entre
plantas y estaciones del año — y sospechamos que correlaciona con por qué el detector falla
más en ciertas imágenes (brillo, suciedad, ver "Casos difíciles" en el visualizador).

Los nombres de archivo del dataset son hashes opacos (`00049ffa58b849d36b15c200fa82fc39.JPG`)
que no dicen nada sobre su origen. La procedencia solo se puede capturar **en el momento en
que las imágenes nuevas se copian al disco**, organizándolas en una estructura de carpetas
que la codifique — después de eso, se pierde para siempre.

## Convención de carpetas para imágenes nuevas

```
<YOLO_IMAGENES_DIR>\<planta>\<año>\<mes>\<día>\archivo.jpg
```

Ejemplo real: `hospicio\2025\3\31\foto123.jpg` (año/mes/día **sin cero adelante**).

`YOLO_IMAGENES_DIR` es la variable de entorno definida en `.env` (raíz del repo, ver
`.env.example`) — nunca se escribe la ruta literal en scripts ni docs de flujo, porque cada
PC puede tener el dataset en una unidad distinta (esta máquina usa `D:\`, un notebook sin esa
letra de unidad usaría otra ruta, y solo cambiaría esa línea de `.env`).

- **año/mes/día en 3 niveles separados, sin cero adelante** — no es una elección de diseño
  nuestra: es el formato que ya usan los scripts de descarga automática de cada planta
  (`download.js`, que espeja la estructura del servidor HTTP de cámaras de esa planta tal
  cual). El parser de `batch_detect.py` normaliza esto a fecha ISO (`YYYY-MM-DD`) recién al
  guardar en `procedencia.csv` — no hay que tocar nada del lado de la descarga.
- **`planta` = nombre de la carpeta** que agrupa las capturas de esa ubicación (ej.
  `hospicio`). Cada carpeta de planta puede pesar muy distinto entre sí — depende de cuántas
  líneas/cámaras tenga esa planta, no es un tamaño fijo.
- Las imágenes que no sigan esta estructura de 4 niveles (por ejemplo las ~3.964 originales,
  que están sueltas en la raíz de `YOLO_IMAGENES_DIR`) simplemente quedan sin procedencia
  registrada — no rompen nada, el pipeline las sigue procesando igual.

### Consolidar una carpeta de descarga nueva

Cuando una planta nueva termina de descargar sus capturas (quedan en `D:\camara_<planta>\`,
fuera de `YOLO_IMAGENES_DIR`), hay que moverla adentro para que el contenedor `yolo` la vea
— el mount de docker-compose solo cubre `YOLO_IMAGENES_DIR`:

```
mv "$YOLO_IMAGENES_DIR\..\camara_<planta>\<año>" "$YOLO_IMAGENES_DIR\<planta>\<año>"
```

Como ambas carpetas viven en el mismo disco, esto es una operación de metadata (rename), no
una copia — instantáneo sin importar cuántos archivos haya. Si el `mv` falla por
"Permission denied", casi seguro es porque el script de descarga dejó procesos `node.exe`
colgados con archivos abiertos aunque `progress.json` ya diga 100% — cerralos o usá
`robocopy origen destino /E /MOVE` como alternativa (más lento, pero reintenta ante locks).

## Por qué CSV y no HTTP directo

`batch_detect.py` corre dentro del contenedor `yolo`, aislado, sin depender de que
`apps/api` esté levantada. Se evaluaron dos formas de pasarle la procedencia al backend:

| | CSV + loader Node (elegido) | HTTP directo desde Python |
|---|---|---|
| Acoplamiento | Ninguno — `yolo` corre igual de aislado que siempre | Necesita que `apps/api` esté arriba y alcanzable en red en ese momento exacto |
| Volumen | 1 upsert masivo (en lotes de 500) para miles de filas | Miles de requests HTTP individuales — lento, y un corte de red a mitad dejaría datos parciales |
| Depuración | El CSV queda como archivo para inspeccionar o re-importar si algo sale mal | Nada queda registrado si falla a mitad de camino |
| Consistencia | Mismo patrón que `cargar-historico-yolo.ts` (ya usado en este repo) | Patrón nuevo, sin precedente acá |
| Dependencias nuevas | Ninguna en el contenedor Python | Hay que agregar `requests` al contenedor `yolo` |

Para un batch de miles de imágenes que corre una vez, de forma aislada, CSV es más simple,
más robusto y no acopla el contenedor `yolo` a que la API esté corriendo. HTTP directo solo
tendría sentido si se necesitara ver la procedencia en Postgres en tiempo real mientras el
batch corre — no es el caso.

## Flujo completo

1. Copiás las imágenes nuevas a `D:\imagenes - copia\<planta>\<YYYY-MM-DD>\`.
2. Corrés `batch_detect.py` (dentro del contenedor `yolo`) — ahora recorre `INPUT_DIR` de
   forma recursiva (`rglob`, antes era `glob` plano) y, además del CSV de detecciones de
   siempre, escribe `services/yolo/runs/patentes/procedencia.csv` con
   `nombre_archivo,planta,fecha` por cada imagen que sí siguió la convención de carpetas.
3. Desde `apps/api`, corrés:
   ```
   npm run cargar:procedencia -- ../../services/yolo/runs/patentes/procedencia.csv
   ```
   Esto hace upsert por `nombre_archivo` en la tabla `procedencia_imagen` — correrlo de
   nuevo con el mismo CSV no duplica nada, es seguro repetirlo.

## Modelo de datos

Tabla `procedencia_imagen` (migración `1789700000000-ProcedenciaImagen.ts`):

| Campo | Tipo | Uso |
|---|---|---|
| `id` | UUID | Identificador |
| `nombre_archivo` | varchar, único | Igual al nombre de archivo de la imagen (hash) |
| `planta` | varchar | Nombre de la planta de origen |
| `fecha` | date | Fecha de captura (`YYYY-MM-DD`) |
| `creado_en` | timestamptz | Cuándo se cargó este registro |

Índice compuesto en `(planta, fecha)` para futuras consultas agrupadas.

## API

- `POST /api/dataset/procedencia` — recibe `{ lote: [{ nombreArchivo, planta, fecha }] }`,
  hace upsert. Pensado principalmente para el loader (`cargar-procedencia.ts`), pero queda
  disponible como endpoint estándar de la API por si hace falta re-importar a mano.
- `GET /api/dataset/procedencia/plantas` — devuelve `[{ planta, total }]`, conteo de
  imágenes con procedencia registrada por planta.

## Espacio en disco

El volumen de capturas escala con la cantidad de líneas/cámaras de cada planta — no es un
número fijo ni predecible de antemano (una planta con 2 líneas pesa mucho menos que una con
10). Por ahora la política es **organización + aviso, no purga automática**: no se borra
nada, pero conviene chequear el espacio libre de vez en cuando, sobre todo antes de una
descarga grande nueva.

```
powershell -ExecutionPolicy Bypass -File scripts\verificar-espacio.ps1
```

Lee `YOLO_IMAGENES_DIR` desde `.env`, mira cuánto espacio libre queda en esa unidad, y avisa
si baja de un umbral (50 GB por defecto, ajustable con `-UmbralGB`). No mueve ni borra nada
— solo informa, para decidir a mano qué hacer si hace falta.

## Qué falta (no incluido todavía)

- Filtro por planta/fecha en el frontend del visualizador de Dataset — hoy la API ya expone
  los datos, pero ninguna pestaña los usa todavía para filtrar o agrupar.
- Decidir si "planta" realmente correlaciona con la tasa de fallos del detector — es una
  hipótesis a confirmar con los datos una vez que haya suficiente volumen importado con
  procedencia.
