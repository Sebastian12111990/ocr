import argparse
import json
import time
from pathlib import Path

import yaml
from ultralytics import YOLO

# --datos apunta a un data.yaml dentro de /workspace/datasets/<id>/ (bind mount rw de
# RUTA_EXPORTS_YOLO, ver ServicioExportadorDataset en apps/api) — un export efimero con
# hardlinks a las imagenes reales, generado antes de correr este script. No se mantiene como
# fuente de verdad (ver docs/decisiones-modelo-dataset.md, decision 5).


def parsear_argumentos() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Entrena/fine-tunea un modelo YOLO y reporta progreso por epoca en JSON.")
    parser.add_argument("--datos", required=True, help="Ruta al data.yaml del export (ver exportar-entrenamiento.ts)")
    parser.add_argument("modelo", help="Peso base .pt a fine-tunear (busca en el cwd o lo descarga, igual que detectar.py)")
    parser.add_argument("--epocas", type=int, default=60)
    parser.add_argument("--imgsz", type=int, default=640, help="640 = resolucion nativa de todo el dataset (ver CLAUDE.md)")
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--workers", type=int, default=4, help="Procesos del dataloader (mosaic/augment corren en CPU)")
    parser.add_argument("--device", default="0", help='indice de GPU (ej. "0") o "cpu"')
    parser.add_argument(
        "--proyecto",
        default="/workspace/runs/entrenamientos",
        help="Carpeta de salida. TIENE que ser absoluta y bajo /workspace (el bind mount rw al "
        "host, igual que detectar.py) — una ruta relativa la resuelve Ultralytics contra su "
        "propio runs_dir interno (/ultralytics/runs), que NO es un bind mount y se pierde si "
        "se recrea el contenedor.",
    )
    parser.add_argument("--nombre", default=None, help="Subcarpeta del proyecto; por defecto un timestamp")
    parser.add_argument("--paciencia", type=int, default=20, help="Epocas sin mejora antes de early stopping")
    parser.add_argument("--semilla", type=int, default=0)
    parser.add_argument(
        "--congelar",
        type=int,
        default=0,
        help="Cantidad de capas del backbone a congelar (0 = ninguna). Util con pocas imagenes: "
        "menos parametros libres, menos sobreajuste.",
    )
    return parser.parse_args()


def imprimir_json(etiqueta: str, **campos: object) -> None:
    print(f"{etiqueta} {json.dumps(campos)}", flush=True)


def numero(diccionario: dict, clave: str) -> float:
    valor = diccionario.get(clave)
    return float(valor) if valor is not None else 0.0


def main() -> None:
    args = parsear_argumentos()
    nombre = args.nombre or time.strftime("%Y%m%d-%H%M%S")

    with open(args.datos, encoding="utf-8") as f:
        cantidad_clases = len(yaml.safe_load(f).get("names", {}))

    modelo = YOLO(args.modelo)
    ultimas_metricas: dict[str, float] = {}

    def al_terminar_epoca(trainer) -> None:
        perdidas = trainer.label_loss_items(trainer.tloss, prefix="train")
        ultimas_metricas.update(
            {
                "epoca": trainer.epoch + 1,
                "boxLoss": numero(perdidas, "train/box_loss"),
                "clsLoss": numero(perdidas, "train/cls_loss"),
                "dflLoss": numero(perdidas, "train/dfl_loss"),
                "map50": numero(trainer.metrics, "metrics/mAP50(B)"),
                "map5095": numero(trainer.metrics, "metrics/mAP50-95(B)"),
                "precision": numero(trainer.metrics, "metrics/precision(B)"),
                "recall": numero(trainer.metrics, "metrics/recall(B)"),
            }
        )
        # Ultralytics dispara este callback una vez mas al final, al re-validar best.pt — con
        # epoch ya en su ultimo valor (+1 da un numero de epoca mayor a args.epocas). Se sigue
        # guardando en ultimas_metricas (RESULTADO necesita esos numeros finales) pero no se
        # imprime como PROGRESO para no mandar "epoca 4 de 3" a quien esta escuchando el stream.
        if ultimas_metricas["epoca"] > args.epocas:
            return
        imprimir_json("PROGRESO", tipo="epoca", totalEpocas=args.epocas, **ultimas_metricas)

    # No hay progreso DENTRO de una epoca (por lote): en Ultralytics 8.4.157 el indice de lote
    # es una variable local de _do_train (`i`/`ni`), no un atributo de `trainer` — no hay de
    # donde leerlo desde un callback (`on_train_batch_end` solo recibe `trainer`). Progreso por
    # epoca alcanza para una UI de barra; si una version futura expone el indice, se puede sumar.
    modelo.add_callback("on_fit_epoch_end", al_terminar_epoca)

    modelo.train(
        data=args.datos,
        epochs=args.epocas,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=args.proyecto,
        name=nombre,
        patience=args.paciencia,
        seed=args.semilla,
        freeze=args.congelar or None,
        single_cls=cantidad_clases == 1,
        deterministic=True,
        close_mosaic=10,
        amp=True,
        plots=True,
        workers=args.workers,
        exist_ok=True,
    )

    # Se usa trainer.save_dir (no el valor de retorno de train(), que cambia de forma entre
    # versiones de Ultralytics) — modelo.trainer queda accesible despues de entrenar.
    pesos = Path(modelo.trainer.save_dir) / "weights" / "best.pt"
    imprimir_json(
        "RESULTADO",
        pesos=str(pesos),
        epocasCompletadas=min(ultimas_metricas.get("epoca", 0), args.epocas),
        map50=ultimas_metricas.get("map50", 0.0),
        map5095=ultimas_metricas.get("map5095", 0.0),
        precision=ultimas_metricas.get("precision", 0.0),
        recall=ultimas_metricas.get("recall", 0.0),
    )


if __name__ == "__main__":
    main()
