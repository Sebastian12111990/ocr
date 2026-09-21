import "reflect-metadata";

import { EntrenamientoYolo } from "../src/features/entrenamientos/entrenamiento-yolo.entidad.js";
import { MetricaEpoca } from "../src/features/entrenamientos/metrica-epoca.entidad.js";
import { fuenteDatos } from "../src/infraestructura/fuente-datos.js";

/**
 * Backfill único de las 3 corridas reales de YOLO hechas antes de que existiera
 * esta tabla (sondeo batch, auto-etiquetado, mini-entrenamiento coco128).
 * Idempotente: si ya existe una fila con el mismo nombre, no la duplica.
 */
async function principal(): Promise<void> {
  await fuenteDatos.initialize();
  const repositorioEntrenamiento = fuenteDatos.getRepository(EntrenamientoYolo);
  const repositorioMetrica = fuenteDatos.getRepository(MetricaEpoca);

  const sondeo = await guardarSiNoExiste(repositorioEntrenamiento, {
    nombre: "Sondeo batch — dataset patentes",
    tipo: "sondeo",
    modeloBase: "yolo11n.pt",
    parametros: {
      fuente: "D:\\imagenes - copia",
      conteoClases: {
        car: 2319,
        truck: 2892,
        bus: 885,
        train: 189,
        person: 1768,
        traffic_light: 107,
        parking_meter: 136,
        clock: 30,
        bottle: 31,
        toilet: 32,
        airplane: 31,
        suitcase: 47,
        surfboard: 29,
      },
    },
    metricasFinales: null,
    totalImagenes: 3964,
    imagenesConDeteccion: 3496,
    rutaPesos: null,
    duracionMs: 115000,
  });

  const autoEtiquetado = await guardarSiNoExiste(repositorioEntrenamiento, {
    nombre: "Auto-etiquetado — license-plate-finetune-v1m",
    tipo: "auto_etiquetado",
    modeloBase: "license-plate-finetune-v1m.pt",
    parametros: {
      fuenteModelo: "morsetechlab/yolov11-license-plate-detection",
      licencia: "AGPL-3.0",
      confThreshold: 0.4,
    },
    metricasFinales: null,
    totalImagenes: 3964,
    imagenesConDeteccion: 3197,
    rutaPesos: null,
    duracionMs: 90000,
  });

  const miniEntrenamiento = await guardarSiNoExiste(repositorioEntrenamiento, {
    nombre: "Mini-entrenamiento — coco128",
    tipo: "entrenamiento",
    modeloBase: "yolo11n.pt",
    parametros: { epochs: 3, imgsz: 640, batch: 16, data: "coco128.yaml" },
    metricasFinales: { map50: 0.696, map50_95: 0.514, precision: 0.724, recall: 0.622 },
    totalImagenes: 128,
    imagenesConDeteccion: null,
    rutaPesos: "runs/detect/train_coco128/weights/best.pt",
    duracionMs: 10800,
  });

  const metricasPorEpoca = [
    { epoca: 1, boxLoss: 1.196, clsLoss: 1.247, dflLoss: 1.207, map50: 0.674, map5095: 0.506, precision: 0.718, recall: 0.572 },
    { epoca: 2, boxLoss: 1.18, clsLoss: 1.248, dflLoss: 1.199, map50: 0.69, map5095: 0.507, precision: 0.704, recall: 0.635 },
    { epoca: 3, boxLoss: 1.106, clsLoss: 1.147, dflLoss: 1.149, map50: 0.696, map5095: 0.514, precision: 0.724, recall: 0.622 },
  ];
  for (const datos of metricasPorEpoca) {
    const existente = await repositorioMetrica.findOne({
      where: { entrenamiento: { id: miniEntrenamiento.id }, epoca: datos.epoca },
    });
    if (existente) continue;
    await repositorioMetrica.save(repositorioMetrica.create({ ...datos, entrenamiento: miniEntrenamiento }));
  }

  console.log(`✓ sondeo: ${sondeo.id}`);
  console.log(`✓ auto-etiquetado: ${autoEtiquetado.id}`);
  console.log(`✓ mini-entrenamiento: ${miniEntrenamiento.id} (${metricasPorEpoca.length} épocas)`);

  await fuenteDatos.destroy();
}

async function guardarSiNoExiste(
  repositorio: ReturnType<typeof fuenteDatos.getRepository<EntrenamientoYolo>>,
  datos: Omit<EntrenamientoYolo, "id" | "creadoEn" | "metricasPorEpoca">,
): Promise<EntrenamientoYolo> {
  const existente = await repositorio.findOne({ where: { nombre: datos.nombre } });
  if (existente) return existente;
  return repositorio.save(repositorio.create(datos));
}

principal().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
