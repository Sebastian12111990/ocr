import "reflect-metadata";

import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { entorno } from "../src/config/env.js";
import { ImagenDataset } from "../src/features/dataset/imagen-dataset.entidad.js";
import { fuenteDatos } from "../src/infraestructura/fuente-datos.js";

/**
 * Indexa `RUTA_IMAGENES_DATASET` en `imagen_dataset`: el disco guarda solo lo que no se puede
 * regenerar (imagen + procedencia derivada del path), todo lo demás va a Postgres. Ver
 * docs/decisiones-modelo-dataset.md. Idempotente — re-correrlo solo refresca `visto_en`.
 *
 * Uso: npm run indexar:dataset
 */
const CONCURRENCIA = 32;
const TAMANO_LOTE = 1000;

/**
 * `<planta>/<año>/<mes>/<día>/archivo.ext` — año/mes/día vienen SIN cero adelante porque así los
 * entrega el servidor de cámaras. Cualquier otra forma → sin procedencia recuperable (planta/fecha null).
 */
function extraerProcedencia(rutaRelativa: string): { planta: string; fecha: string } | null {
  const partes = rutaRelativa.split("/");
  if (partes.length !== 5) return null;

  const [planta, anio, mes, dia] = partes;
  const anioNum = Number(anio);
  const mesNum = Number(mes);
  const diaNum = Number(dia);
  if (!Number.isInteger(anioNum) || !Number.isInteger(mesNum) || !Number.isInteger(diaNum)) return null;

  const fecha = new Date(Date.UTC(anioNum, mesNum - 1, diaNum));
  if (fecha.getUTCFullYear() !== anioNum || fecha.getUTCMonth() !== mesNum - 1 || fecha.getUTCDate() !== diaNum) {
    return null;
  }

  const fechaIso = `${anio}-${String(mesNum).padStart(2, "0")}-${String(diaNum).padStart(2, "0")}`;
  return { planta, fecha: fechaIso };
}

function parsearSofJpeg(buffer: Buffer): { ancho: number; alto: number } | null {
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marcador = buffer[offset + 1];
    if (marcador === 0xd8 || marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd9)) {
      offset += 2;
      continue;
    }
    if (offset + 4 > buffer.length) return null;
    const longitud = buffer.readUInt16BE(offset + 2);
    const esSof = marcador >= 0xc0 && marcador <= 0xcf && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc;
    if (esSof) {
      if (offset + 9 > buffer.length) return null;
      const alto = buffer.readUInt16BE(offset + 5);
      const ancho = buffer.readUInt16BE(offset + 7);
      return { ancho, alto };
    }
    if (marcador === 0xda) return null; // SOS: no hay más metadata antes de los datos comprimidos
    offset += 2 + longitud;
  }
  return null;
}

function parsearIhdrPng(buffer: Buffer): { ancho: number; alto: number } | null {
  if (buffer.length < 24 || buffer.toString("ascii", 12, 16) !== "IHDR") return null;
  return { ancho: buffer.readUInt32BE(16), alto: buffer.readUInt32BE(20) };
}

/**
 * Lee dimensiones por contenido, no por extensión: en esta PC el servidor de cámaras entrega
 * PNG dentro de carpetas `JPG/` con nombre `*.JPG` (verificado — no es un bug de este repo, es
 * lo que manda el servidor). cv2/PIL ya lo toleran; acá hacemos lo mismo.
 */
async function leerDimensionesImagen(rutaAbsoluta: string): Promise<{ ancho: number; alto: number }> {
  const handle = await open(rutaAbsoluta, "r");
  try {
    let tamano = 65536;
    for (;;) {
      const buffer = Buffer.alloc(tamano);
      const { bytesRead } = await handle.read(buffer, 0, tamano, 0);
      const region = buffer.subarray(0, bytesRead);

      if (region.length >= 8 && region[0] === 0x89 && region.toString("ascii", 1, 4) === "PNG") {
        const dim = parsearIhdrPng(region);
        if (dim) return dim;
      } else if (region.length >= 4 && region[0] === 0xff && region[1] === 0xd8) {
        const dim = parsearSofJpeg(region);
        if (dim) return dim;
      } else if (bytesRead > 0) {
        throw new Error(`Formato de imagen no reconocido (no es PNG ni JPEG): ${rutaAbsoluta}`);
      }

      if (bytesRead < tamano) throw new Error(`No se encontraron dimensiones en: ${rutaAbsoluta}`);
      tamano *= 4;
      if (tamano > 8 * 1024 * 1024) throw new Error(`Encabezado de imagen demasiado grande: ${rutaAbsoluta}`);
    }
  } finally {
    await handle.close();
  }
}

async function ejecutarConConcurrencia<T, R>(
  items: T[],
  concurrencia: number,
  tarea: (item: T) => Promise<R>,
): Promise<R[]> {
  const resultados: R[] = new Array(items.length);
  let siguiente = 0;

  async function trabajador(): Promise<void> {
    for (;;) {
      const indice = siguiente++;
      if (indice >= items.length) return;
      resultados[indice] = await tarea(items[indice]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrencia, items.length) }, trabajador));
  return resultados;
}

interface FilaIndexada {
  rutaRelativa: string;
  nombreArchivo: string;
  planta: string | null;
  fecha: string | null;
  ancho: number;
  alto: number;
  tamanoBytes: string;
  vistoEn: Date;
}

async function principal(): Promise<void> {
  const raiz = entorno.RUTA_IMAGENES_DATASET;
  console.log(`Escaneando ${raiz} ...`);

  const entradas = await readdir(raiz, { recursive: true });
  const rutasRelativas = entradas
    .filter((entrada) => entrada.toLowerCase().endsWith(".jpg"))
    .map((entrada) => entrada.split(path.sep).join("/"));

  console.log(`Encontradas ${rutasRelativas.length} imágenes .JPG (recursivo)`);

  const inicioCorrida = new Date();
  let procesadas = 0;
  let errores = 0;
  const erroresDetalle: string[] = [];

  const filas = await ejecutarConConcurrencia(rutasRelativas, CONCURRENCIA, async (rutaRelativa) => {
    const rutaAbsoluta = path.join(raiz, rutaRelativa);
    try {
      const [info, dimensiones] = await Promise.all([stat(rutaAbsoluta), leerDimensionesImagen(rutaAbsoluta)]);
      const procedencia = extraerProcedencia(rutaRelativa);
      procesadas += 1;
      if (procesadas % 5000 === 0) console.log(`  ... ${procesadas}/${rutasRelativas.length} leídas`);

      const fila: FilaIndexada = {
        rutaRelativa,
        nombreArchivo: path.posix.basename(rutaRelativa),
        planta: procedencia?.planta ?? null,
        fecha: procedencia?.fecha ?? null,
        ancho: dimensiones.ancho,
        alto: dimensiones.alto,
        tamanoBytes: String(info.size),
        vistoEn: inicioCorrida,
      };
      return fila;
    } catch (error) {
      errores += 1;
      erroresDetalle.push(`${rutaRelativa}: ${(error as Error).message}`);
      return null;
    }
  });

  const filasValidas = filas.filter((fila): fila is FilaIndexada => fila !== null);
  const sinProcedencia = filasValidas.filter((fila) => fila.planta === null).length;

  await fuenteDatos.initialize();
  const repositorio = fuenteDatos.getRepository(ImagenDataset);

  let indexadas = 0;
  for (let i = 0; i < filasValidas.length; i += TAMANO_LOTE) {
    const lote = filasValidas.slice(i, i + TAMANO_LOTE);
    await repositorio.upsert(lote, { conflictPaths: ["rutaRelativa"], skipUpdateIfNoValuesChanged: false });
    indexadas += lote.length;
    console.log(`  ... ${indexadas}/${filasValidas.length} indexadas en BD`);
  }

  const desaparecidas = await repositorio
    .createQueryBuilder("imagen")
    .where("imagen.vistoEn < :inicio", { inicio: inicioCorrida })
    .getCount();

  await fuenteDatos.destroy();

  console.log();
  console.log(`Total encontradas:    ${rutasRelativas.length}`);
  console.log(`Indexadas en BD:      ${indexadas}`);
  console.log(`Sin procedencia:      ${sinProcedencia}`);
  console.log(`Errores de lectura:   ${errores}`);
  if (erroresDetalle.length > 0) {
    console.log(`Primeros errores:\n  ${erroresDetalle.slice(0, 20).join("\n  ")}`);
  }
  if (desaparecidas > 0) {
    console.log(`AVISO: ${desaparecidas} filas en BD no se vieron en esta corrida (posible borrado en disco).`);
  }
}

principal().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
