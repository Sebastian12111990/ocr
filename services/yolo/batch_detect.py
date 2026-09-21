import csv
from collections import Counter
from pathlib import Path

from ultralytics import YOLO

INPUT_DIR = Path("/data/patentes")
OUTPUT_DIR = Path("/workspace/runs/patentes")
SAMPLE_DIR = OUTPUT_DIR / "muestra"
CSV_PATH = OUTPUT_DIR / "detecciones.csv"
SAMPLE_SIZE = 20

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

images = sorted(INPUT_DIR.glob("*.JPG"))
print(f"Encontradas {len(images)} imagenes en {INPUT_DIR}")

model = YOLO("yolo11n.pt")

class_counts = Counter()
images_with_detections = 0
images_processed = 0

with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["imagen", "clase", "confianza", "x1", "y1", "x2", "y2"])

    results = model.predict(source=str(INPUT_DIR), batch=16, stream=True, verbose=False)

    for i, result in enumerate(results):
        img_path = Path(result.path)
        images_processed += 1
        boxes = result.boxes

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
print()
print("Conteo por clase:")
for cls_name, count in class_counts.most_common():
    print(f"  {cls_name:15s} {count}")
print()
print(f"CSV completo:     {CSV_PATH}")
print(f"Muestra anotada:  {SAMPLE_DIR} ({min(SAMPLE_SIZE, len(images))} imagenes)")
