import csv
from collections import Counter
from datetime import date
from pathlib import Path

from ultralytics import YOLO

INPUT_DIR = Path("/data/patentes")
OUTPUT_DIR = Path("/workspace/runs/patentes")
SAMPLE_DIR = OUTPUT_DIR / "muestra"
CSV_PATH = OUTPUT_DIR / "detecciones.csv"
PROCEDENCIA_CSV_PATH = OUTPUT_DIR / "procedencia.csv"
SAMPLE_SIZE = 20

# Imagenes organizadas como <planta>/<año>/<mes>/<día>/archivo.jpg — ver
# docs/procedencia-imagenes.md. año/mes/día vienen SIN cero adelante (ej. "3/9",
# no "03/09") porque asi las entrega el servidor de camaras de cada planta —
# se normalizan a fecha ISO (YYYY-MM-DD) al guardar.

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)


def extraer_procedencia(img_path: Path) -> tuple[str, str] | None:
    """De 'INPUT_DIR/<planta>/<año>/<mes>/<día>/foto.jpg' devuelve (planta, fecha ISO).
    Si la imagen esta suelta (sin esa estructura de 4 niveles) o las carpetas no son
    numericas, devuelve None — no rompe, esa imagen simplemente queda sin procedencia."""
    partes = img_path.relative_to(INPUT_DIR).parts
    if len(partes) < 4:
        return None

    planta, anio, mes, dia = partes[0], partes[1], partes[2], partes[3]
    try:
        fecha = date(int(anio), int(mes), int(dia))
    except ValueError:
        return None
    return planta, fecha.isoformat()


images = sorted(INPUT_DIR.rglob("*.JPG"))
print(f"Encontradas {len(images)} imagenes en {INPUT_DIR} (recursivo)")

model = YOLO("yolo11n.pt")

class_counts = Counter()
images_with_detections = 0
images_processed = 0
sin_procedencia = 0

with (
    open(CSV_PATH, "w", newline="", encoding="utf-8") as f_det,
    open(PROCEDENCIA_CSV_PATH, "w", newline="", encoding="utf-8") as f_proc,
):
    writer = csv.writer(f_det)
    writer.writerow(["imagen", "clase", "confianza", "x1", "y1", "x2", "y2"])

    writer_proc = csv.writer(f_proc)
    writer_proc.writerow(["nombre_archivo", "planta", "fecha"])

    results = model.predict(source=str(INPUT_DIR), batch=16, stream=True, verbose=False)

    for i, result in enumerate(results):
        img_path = Path(result.path)
        images_processed += 1
        boxes = result.boxes

        procedencia = extraer_procedencia(img_path)
        if procedencia is None:
            sin_procedencia += 1
        else:
            planta, fecha = procedencia
            writer_proc.writerow([img_path.name, planta, fecha])

        if len(boxes) == 0:
            writer.writerow([img_path.name, "", "", "", "", "", ""])
        else:
            images_with_detections += 1
            for box in boxes:
                cls_name = result.names[int(box.cls[0])]
                conf = float(box.conf[0])
                x1, y1, x2, y2 = [round(v, 1) for v in box.xyxy[0].tolist()]
                class_counts[cls_name] += 1
                writer.writerow([img_path.name, cls_name, round(conf, 3), x1, y1, x2, y2])

        if i < SAMPLE_SIZE:
            result.save(filename=str(SAMPLE_DIR / img_path.name))

        if images_processed % 500 == 0:
            print(f"  ... {images_processed}/{len(images)} procesadas")

print()
print(f"Total procesadas:        {images_processed}")
print(f"Con alguna deteccion:    {images_with_detections} ({100 * images_with_detections / images_processed:.1f}%)")
print(f"Sin detecciones:         {images_processed - images_with_detections}")
print(f"Sin procedencia (fuera de <planta>/<año>/<mes>/<día>/): {sin_procedencia}")
print()
print("Conteo por clase:")
for cls_name, count in class_counts.most_common():
    print(f"  {cls_name:15s} {count}")
print()
print(f"CSV completo:      {CSV_PATH}")
print(f"CSV procedencia:   {PROCEDENCIA_CSV_PATH}")
print(f"Muestra anotada:   {SAMPLE_DIR} ({min(SAMPLE_SIZE, len(images))} imagenes)")
print()
print("Para cargar la procedencia en Postgres, desde apps/api:")
print("  npm run cargar:procedencia -- ../../services/yolo/runs/patentes/procedencia.csv")
