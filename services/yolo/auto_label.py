from pathlib import Path

from ultralytics import YOLO

BASE = Path("/data/patentes_dataset")
SOURCE_DIRS = [BASE / "dataset", BASE / "sin_vehiculo"]
LABELS_DIR = BASE / "labels"
CONF_THRESHOLD = 0.4
CLASS_ID = 0  # patente

LABELS_DIR.mkdir(parents=True, exist_ok=True)
(LABELS_DIR / "classes.txt").write_text("patente\n", encoding="utf-8")

model = YOLO("license-plate-finetune-v1m.pt")

total = 0
labeled = 0
no_detection = 0

for src_dir in SOURCE_DIRS:
    images = sorted(src_dir.glob("*.JPG"))
    print(f"\n{src_dir.name}: {len(images)} imagenes")

    results = model.predict(source=str(src_dir), batch=16, stream=True, conf=CONF_THRESHOLD, verbose=False)

    for result in results:
        img_path = Path(result.path)
        total += 1
        boxes = result.boxes
        txt_path = LABELS_DIR / (img_path.stem + ".txt")

        if len(boxes) == 0:
            no_detection += 1
            txt_path.write_text("", encoding="utf-8")
        else:
            labeled += 1
            lines = []
            for xc, yc, w, h in boxes.xywhn.tolist():
                lines.append(f"{CLASS_ID} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}")
            txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

        if total % 500 == 0:
            print(f"  ... {total} procesadas")

print()
print(f"Total procesadas:  {total}")
print(f"Auto-etiquetadas:  {labeled} ({100 * labeled / total:.1f}%)")
print(f"Sin deteccion:     {no_detection} (quedan con .txt vacio, para revisar/etiquetar a mano)")
print()
print(f"Labels en: {LABELS_DIR}")
