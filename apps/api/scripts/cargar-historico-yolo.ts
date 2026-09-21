import "reflect-metadata";

import { EntrenamientoYolo } from "../src/features/entrenamientos/entrenamiento-yolo.entidad.js";
import { MetricaEpoca } from "../src/features/entrenamientos/metrica-epoca.entidad.js";
import { fuenteDatos } from "../src/infraestructura/fuente-datos.js";

/**
 * Carga como filas históricas las 3 corridas de YOLO que ya se ejecutaron
 * contra el dataset real de patentes, antes de que este servicio existiera
 * en `ocr` (ver SPEC 02). Se corre una sola vez — no es idempotente a
 * propósito, cada corrida real es un hecho que pasó una sola vez.
 */
async function principal(): Promise<void> {
  await fuenteDatos.initialize();

  const repositorioEntrenamiento = fuenteDatos.getRepository(EntrenamientoYolo);
  const repositorioMetrica = fuenteDatos.getRepository(MetricaEpoca);

  const sondeo = await repositorioEntrenamiento.save(repositorioEntrenamiento.create({
    nombre: "Sondeo batch — dataset patentes",
    tipo: "sondeo",
    modeloBase: "yolo11n.pt",
    parametros: {
      fuente: "D:\\imagenes - copia",
      conteoClases: {
        truck: 2892, car: 2319, person: 1768, bus: 885, train: 189,
        parking_meter: 136, traffic_light: 107, suitcase: 47, toilet: 32,
        airplane: 31, bottle: 31, clock: 30, surfboard: 29,
      },
    },
    metricasFinales: null,
    totalImagenes: 3964,
    imagenesConDeteccion: 3496,
    rutaPesos: null,
    duracionMs: 115_000,
  }));
  console.log(`Sondeo cargado: ${sondeo.id}`);

  const autoEtiquetado = await repositorioEntrenamiento.save(repositorioEntrenamiento.create({
    nombre: "Auto-etiquetado — license-plate-finetune-v1m",
    tipo: "auto_etiquetado",
    modeloBase: "license-plate-finetune-v1m.pt",
    parametros: { confThreshold: 0.4, licencia: "AGPL-3.0", fuenteModelo: "morsetechlab/yolov11-license-plate-detection" },
    metricasFinales: null,
    totalImagenes: 3964,
    imagenesConDeteccion: 3197,
    rutaPesos: null,
    duracionMs: 90_000,
  }));
  console.log(`Auto-etiquetado cargado: ${autoEtiquetado.id}`);

  const entrenamiento = await repositorioEntrenamiento.save(repositorioEntrenamiento.create({
    nombre: "Mini-entrenamiento — coco128",
    tipo: "entrenamiento",
    modeloBase: "yolo11n.pt",
    parametros: { epochs: 3, imgsz: 640, batch: 16, data: "coco128.yaml" },
    metricasFinales: { map50: 0.696, map50_95: 0.514, precision: 0.724, recall: 0.622 },
    totalImagenes: 128,
    imagenesConDeteccion: null,
    rutaPesos: "runs/detect/train_coco128/weights/best.pt",
    duracionMs: 10_800,
  }));
  console.log(`Entrenamiento cargado: ${entrenamiento.id}`);

  const metricasPorEpoca = [
    { epoca: 1, boxLoss: 1.196, clsLoss: 1.247, dflLoss: 1.207, precision: 0.718, recall: 0.572, map50: 0.674, map5095: 0.506 },
    { epoca: 2, boxLoss: 1.18, clsLoss: 1.248, dflLoss: 1.199, precision: 0.704, recall: 0.635, map50: 0.69, map5095: 0.507 },
    { epoca: 3, boxLoss: 1.106, clsLoss: 1.147, dflLoss: 1.149, precision: 0.724, recall: 0.622, map50: 0.696, map5095: 0.514 },
  ];
  await repositorioMetrica.save(
    metricasPorEpoca.map((metrica) => repositorioMetrica.create({ ...metrica, entrenamiento })),
  );
  console.log(`${metricasPorEpoca.length} filas de metrica_epoca cargadas`);

  await fuenteDatos.destroy();
}

principal().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
