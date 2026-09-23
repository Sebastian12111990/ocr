import argparse
import csv
from collections import Counter
from pathlib import Path

from ultralytics import YOLO

INPUT_DIR = Path("/data/patentes")
OUTPUT_DIR = Path("/workspace/runs")
TAMANO_LOTE = 150
FRECUENCIA_PROGRESO = 25

# INPUT_DIR = RUTA_IMAGENES_DATASET montada por compose.yml. Reemplaza a batch_detect.py y
# auto_label.py: ya no hay carpetas dataset/sin_vehiculo/sin_deteccion — las detecciones de
# cualquier modelo (COCO exploratorio o fine-tuneado de patentes) van al mismo CSV, versionadas
# por nombre de modelo, y de ahi a la tabla deteccion_imagen (ver docs/decisiones-modelo-dataset.md).


def parsear_argumentos() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Corre un modelo YOLO sobre todo el dataset y guarda las detecciones en CSV.",
    )
    parser.add_argument("modelo", help="Ruta o nombre del peso .pt (YOLO lo busca en el cwd o lo descarga)")
    parser.add_argument("--conf", type=float, default=0.25, help="Umbral de confianza minimo")
    parser.add_argument(
        "--batch",
        type=int,
        default=8,
        help="Imagenes por batch de inferencia",
    )
    parser.add_argument(
        "--device",
        default="cpu",
        help='"cpu" (default) o el indice de GPU (ej. "0"). GPUs de laptop con poca VRAM '
        "(ej. 2GB) revientan con CUDA_ERROR_OUT_OF_MEMORY de forma intermitente incluso con "
        "batch chico, compitiendo por VRAM con el resto de Windows — probado en este repo.",
    )
    parser.add_argument(
        "--clases",
        default=None,
        help="Lista separada por comas de clases a guardar por nombre (ej. car,truck,bus,motorcycle). Por defecto guarda todas.",
    )
    parser.add_argument(
        "--clase-como",
        default=None,
        help="Renombra toda clase detectada a este nombre — para modelos fine-tuneados de una sola clase (ej. patente)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Procesar solo las primeras N imagenes (para probar rapido antes de correr las 165k)",
    )
    parser.add_argument(
        "--lista",
        default=None,
        help="Archivo con una ruta relativa por linea (relativa a INPUT_DIR, con '/'). Si se pasa, "
        "no se escanea el directorio completo — para procesar solo una planta/rango de fechas "
        "elegido desde la vista.",
    )
    return parser.parse_args()


def main() -> None:
    args = parsear_argumentos()
    modelo_nombre = Path(args.modelo).stem
    clases_permitidas = {c.strip() for c in args.clases.split(",")} if args.clases else None

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    csv_path = OUTPUT_DIR / f"detecciones-{modelo_nombre}.csv"

    model = YOLO(args.modelo)

    if args.lista:
        with open(args.lista, encoding="utf-8") as f_lista:
            images = [INPUT_DIR / linea.strip() for linea in f_lista if linea.strip()]
        print(f"Usando lista de {len(images)} imagenes desde {args.lista}")
    else:
        images = sorted(INPUT_DIR.rglob("*.JPG"))
        print(f"Encontradas {len(images)} imagenes en {INPUT_DIR} (recursivo)")
    if args.limit:
        images = images[: args.limit]
        print(f"Limitado a las primeras {len(images)} (--limit)")

    total_imagenes = 0
    total_detecciones = 0
    class_counts: Counter[str] = Counter()

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["ruta_relativa", "modelo", "clase", "confianza", "xc", "yc", "ancho", "alto"])

        # Se pasa la lista de archivos ya resuelta (no el directorio): Ultralytics globea un
        # directorio sin recursividad y esta estructura tiene 4 niveles (planta/año/mes/día/),
        # así que `source=str(INPUT_DIR)` encuentra 0 imágenes.
        #
        # Se llama a predict() en lotes de TAMANO_LOTE, no con los 165k paths juntos: pasarle
        # una lista gigante hace que la validación inicial de Ultralytics (sobre el bind mount
        # de Windows, mucho más lento que un disco nativo) acumule memoria sin límite —
        # verificado: 5.000 paths con yolo11n ya reventó a >5GB y el proceso murió (OOM). Cada
        # lote se descarta (y su memoria se libera) antes de arrancar el siguiente. 150 en vez de
        # 500: con el modelo de patentes (20M parámetros, ~8x yolo11n) 100 imágenes ya llegan a
        # ~4GB de RSS — con lotes de 500 el contenedor terminaba OOM-killed (código 137).
        for inicio in range(0, len(images), TAMANO_LOTE):
            lote = images[inicio : inicio + TAMANO_LOTE]
            results = model.predict(
                source=[str(p) for p in lote],
                batch=args.batch,
                stream=True,
                conf=args.conf,
                verbose=False,
                device=args.device,
            )

            for result in results:
                img_path = Path(result.path)
                ruta_relativa = img_path.relative_to(INPUT_DIR).as_posix()
                total_imagenes += 1

                for box in result.boxes:
                    clase_original = result.names[int(box.cls[0])]
                    if clases_permitidas is not None and clase_original not in clases_permitidas:
                        continue

                    clase_final = args.clase_como or clase_original
                    confianza = float(box.conf[0])
                    xc, yc, ancho, alto = box.xywhn[0].tolist()
                    class_counts[clase_final] += 1
                    total_detecciones += 1
                    writer.writerow(
                        [
                            ruta_relativa,
                            modelo_nombre,
                            clase_final,
                            round(confianza, 4),
                            round(xc, 6),
                            round(yc, 6),
                            round(ancho, 6),
                            round(alto, 6),
                        ]
                    )

                # Progreso cada FRECUENCIA_PROGRESO imagenes, no solo al final de cada lote de
                # TAMANO_LOTE — si no, la barra de progreso del panel queda "pegada" en 0 por un
                # buen rato y salta de golpe al terminar el lote.
                if total_imagenes % FRECUENCIA_PROGRESO == 0:
                    print(f"  ... {total_imagenes}/{len(images)} procesadas", flush=True)

            f.flush()
            print(f"  ... {total_imagenes}/{len(images)} procesadas", flush=True)

    print()
    print(f"Imagenes procesadas: {total_imagenes}")
    print(f"Detecciones totales: {total_detecciones}")
    print("Conteo por clase:")
    for clase, cantidad in class_counts.most_common():
        print(f"  {clase:20s} {cantidad}")
    print()
    print(f"CSV: {csv_path}")
    print("Para cargar en Postgres, desde apps/api:")
    print(f"  npm run cargar:detecciones -- ../../services/yolo/runs/{csv_path.name}")


if __name__ == "__main__":
    main()
