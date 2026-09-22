import "reflect-metadata";

import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

import { ProcedenciaImagen } from "../src/features/dataset/procedencia-imagen.entidad.js";
import { fuenteDatos } from "../src/infraestructura/fuente-datos.js";

/**
 * Carga procedencia.csv (nombre_archivo,planta,fecha) generado por
 * services/yolo/batch_detect.py hacia la tabla `procedencia_imagen`.
 * Upsert por nombre_archivo — correrlo de nuevo con el mismo CSV no duplica.
 * Ver docs/procedencia-imagenes.md para el porqué de este flujo (CSV, no HTTP).
 *
 * Uso: npm run cargar:procedencia -- <ruta-al-csv>
 *   (por defecto: services/yolo/runs/patentes/procedencia.csv)
 */
const RUTA_POR_DEFECTO = path.resolve(import.meta.dirname, "../../../services/yolo/runs/patentes/procedencia.csv");

async function principal(): Promise<void> {
  const rutaCsv = process.argv[2] ?? RUTA_POR_DEFECTO;
  if (!existsSync(rutaCsv)) {
    throw new Error(`No existe el archivo: ${rutaCsv}`);
  }

  const lote: { nombreArchivo: string; planta: string; fecha: string }[] = [];
  const lineas = readline.createInterface({ input: createReadStream(rutaCsv, "utf-8") });

  let esEncabezado = true;
  for await (const linea of lineas) {
    if (esEncabezado) {
      esEncabezado = false;
      continue;
    }
    if (!linea.trim()) continue;

    const [nombreArchivo, planta, fecha] = linea.split(",");
    if (!nombreArchivo || !planta || !fecha) {
      console.warn(`Línea inválida, se omite: ${linea}`);
      continue;
    }
    lote.push({ nombreArchivo: nombreArchivo.trim(), planta: planta.trim(), fecha: fecha.trim() });
  }

  console.log(`Leídas ${lote.length} filas de ${rutaCsv}`);

  await fuenteDatos.initialize();
  const repositorio = fuenteDatos.getRepository(ProcedenciaImagen);

  const TAMANO_LOTE = 500;
  let cargadas = 0;
  for (let i = 0; i < lote.length; i += TAMANO_LOTE) {
    const trozo = lote.slice(i, i + TAMANO_LOTE);
    await repositorio.upsert(trozo, { conflictPaths: ["nombreArchivo"] });
    cargadas += trozo.length;
    console.log(`  ... ${cargadas}/${lote.length} cargadas`);
  }

  await fuenteDatos.destroy();
  console.log(`Listo: ${cargadas} filas en procedencia_imagen`);
}

principal().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
