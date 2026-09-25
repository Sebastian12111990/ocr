import "reflect-metadata";

import { createReadStream, existsSync } from "node:fs";
import readline from "node:readline";

import { DeteccionImagen } from "../src/features/dataset/deteccion-imagen.entidad.js";
import { EtiquetaImagen } from "../src/features/dataset/etiqueta-imagen.entidad.js";
import { ImagenDataset } from "../src/features/dataset/imagen-dataset.entidad.js";
import { TipoEtiqueta } from "../src/features/dataset/tipo-etiqueta.entidad.js";
import { ServicioDataset } from "../src/features/dataset/dataset.service.js";
import type { FilaDeteccionCsv } from "../src/features/dataset/dataset.types.js";
import { fuenteDatos } from "../src/infraestructura/fuente-datos.js";

/**
 * Carga `detecciones-<modelo>.csv` (generado por services/yolo/detectar.py) hacia
 * `deteccion_imagen`, vía `ServicioDataset.cargarDetecciones` (misma lógica que usa el
 * procesamiento bajo demanda desde la vista) — construido a mano contra los repos, sin pasar
 * por el contenedor Inversify, como el resto de los scripts de este directorio.
 *
 * Uso: npm run cargar:detecciones -- <ruta-al-csv> [--reemplazar]
 */
async function leerCsv(rutaCsv: string): Promise<{ modelo: string; filas: FilaDeteccionCsv[] }> {
  const filas: FilaDeteccionCsv[] = [];
  let modelo = "";
  const lineas = readline.createInterface({ input: createReadStream(rutaCsv, "utf-8") });

  let esEncabezado = true;
  for await (const linea of lineas) {
    if (esEncabezado) {
      esEncabezado = false;
      continue;
    }
    if (!linea.trim()) continue;

    const [rutaRelativa, modeloFila, clase, confianza, xc, yc, ancho, alto] = linea.split(",");
    if (!rutaRelativa || !modeloFila || !clase) {
      console.warn(`Línea inválida, se omite: ${linea}`);
      continue;
    }
    modelo = modeloFila.trim();
    filas.push({
      rutaRelativa: rutaRelativa.trim(),
      clase: clase.trim(),
      confianza: Number(confianza),
      xc: Number(xc),
      yc: Number(yc),
      ancho: Number(ancho),
      alto: Number(alto),
    });
  }
  return { modelo, filas };
}

async function principal(): Promise<void> {
  const rutaCsv = process.argv[2];
  const reemplazar = process.argv.includes("--reemplazar");
  if (!rutaCsv || !existsSync(rutaCsv)) {
    throw new Error(`Uso: npm run cargar:detecciones -- <ruta-al-csv> [--reemplazar]`);
  }

  const { modelo, filas } = await leerCsv(rutaCsv);
  if (filas.length === 0) {
    console.log("CSV sin filas, nada que cargar.");
    return;
  }
  console.log(`Leídas ${filas.length} filas de ${rutaCsv} (modelo: ${modelo})`);

  await fuenteDatos.initialize();
  const servicio = new ServicioDataset(
    fuenteDatos.getRepository(ImagenDataset),
    fuenteDatos.getRepository(TipoEtiqueta),
    fuenteDatos.getRepository(EtiquetaImagen),
    fuenteDatos.getRepository(DeteccionImagen),
  );

  const resultado = await servicio.cargarDetecciones(filas, modelo, { reemplazar });
  if (resultado.sinImagen > 0) {
    console.warn(`${resultado.sinImagen} filas del CSV no tienen imagen indexada (correr npm run indexar:dataset primero).`);
  }
  if (resultado.protegidas > 0) {
    console.warn(`${resultado.protegidas} imágenes con veredicto humano del modelo "${modelo}" se dejaron intactas, no se reemplazaron.`);
  }

  await fuenteDatos.destroy();
  console.log(`Listo: ${resultado.cargadas} detecciones del modelo "${modelo}" en deteccion_imagen`);
}

principal().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
