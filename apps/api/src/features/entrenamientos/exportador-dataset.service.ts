import { createHash, randomUUID } from "node:crypto";
import { copyFile, link, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { inject, injectable } from "inversify";

import { ServicioDataset } from "../dataset/dataset.service.js";
import type { ImagenParaEntrenar } from "../dataset/dataset.types.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { entorno } from "../../config/env.js";
import { ErrorValidacion } from "../../shared/http/error-aplicacion.js";

const TAMANO_MINIMO_PX = 2;
const FRACCION_VAL_DEFECTO = 0.2;
const SEMILLA_DEFECTO = 0;

export interface OpcionesExportarEntrenamiento {
  clases: string[];
  fraccionVal?: number;
  semilla?: number;
}

interface FilaConGrupo {
  fila: ImagenParaEntrenar;
  grupo: string;
}

interface PlanSplit {
  filas: FilaConGrupo[];
  gruposVal: Set<string>;
  fraccionVal: number;
  semilla: number;
  advertencia: string | null;
}

export interface ResumenSplit {
  totalImagenes: number;
  totalCajas: number;
  train: { imagenes: number; cajas: number };
  val: { imagenes: number; cajas: number };
  grupos: number;
  gruposVal: number;
  advertencia: string | null;
}

export interface ResultadoExportarEntrenamiento extends ResumenSplit {
  id: string;
  directorio: string;
}

/** Arma el export efímero images/+labels/+data.yaml que Ultralytics necesita para entrenar (ver
 * docs/decisiones-modelo-dataset.md, decisión 5) usando hardlinks — no duplica bytes de las
 * imágenes. Va a `RUTA_EXPORTS_YOLO`, NUNCA dentro de `RUTA_IMAGENES_DATASET`: si viviera ahí,
 * `indexar-dataset.ts` lo indexaría como si fueran imágenes nuevas del dataset. */
@injectable()
export class ServicioExportadorDataset {
  private readonly raizImagenes = entorno.RUTA_IMAGENES_DATASET;
  private readonly raizExports = entorno.RUTA_EXPORTS_YOLO;

  constructor(@inject(TIPOS.ServicioDataset) private readonly servicioDataset: ServicioDataset) {}

  async previsualizar(opciones: OpcionesExportarEntrenamiento): Promise<ResumenSplit> {
    const plan = await this.planificarSplit(opciones);
    return this.resumirSplit(plan);
  }

  async exportar(opciones: OpcionesExportarEntrenamiento): Promise<ResultadoExportarEntrenamiento> {
    const plan = await this.planificarSplit(opciones);
    const resumen = this.resumirSplit(plan);
    if (resumen.val.imagenes === 0) {
      throw new ErrorValidacion(
        "El split dejó 0 imágenes en val — subí fraccionVal o revisá más imágenes antes de exportar.",
      );
    }

    const id = randomUUID();
    const directorio = path.join(this.raizExports, id);
    const carpetas = {
      imagesTrain: path.join(directorio, "images", "train"),
      imagesVal: path.join(directorio, "images", "val"),
      labelsTrain: path.join(directorio, "labels", "train"),
      labelsVal: path.join(directorio, "labels", "val"),
    };
    await Promise.all(Object.values(carpetas).map((carpeta) => mkdir(carpeta, { recursive: true })));

    const manifiestoImagenes: Record<string, { rutaRelativa: string; split: "train" | "val"; cajas: number }> = {};

    for (const { fila, grupo } of plan.filas) {
      const esVal = plan.gruposVal.has(grupo);
      const carpetaImg = esVal ? carpetas.imagesVal : carpetas.imagesTrain;
      const carpetaLbl = esVal ? carpetas.labelsVal : carpetas.labelsTrain;

      const origen = path.resolve(this.raizImagenes, fila.rutaRelativa);
      await enlazarOCopiar(origen, path.join(carpetaImg, `${fila.imagenId}.JPG`));

      const lineas = fila.cajas
        .map((caja) => normalizarCaja(caja, fila.ancho, fila.alto))
        .filter((caja): caja is CajaNormalizada => caja !== null)
        .map((caja) => `${opciones.clases.indexOf(caja.clase)} ${caja.xc} ${caja.yc} ${caja.ancho} ${caja.alto}`);
      await writeFile(path.join(carpetaLbl, `${fila.imagenId}.txt`), lineas.length ? `${lineas.join("\n")}\n` : "");

      manifiestoImagenes[fila.imagenId] = {
        rutaRelativa: fila.rutaRelativa,
        split: esVal ? "val" : "train",
        cajas: lineas.length,
      };
    }

    await writeFile(path.join(directorio, "data.yaml"), generarDataYaml(id, opciones.clases));
    await writeFile(
      path.join(directorio, "manifiesto.json"),
      JSON.stringify(
        {
          semilla: plan.semilla,
          fraccionVal: plan.fraccionVal,
          clases: opciones.clases,
          gruposVal: [...plan.gruposVal],
          advertencia: plan.advertencia,
          imagenes: manifiestoImagenes,
        },
        null,
        2,
      ),
    );

    return { id, directorio, ...resumen };
  }

  private async planificarSplit(opciones: OpcionesExportarEntrenamiento): Promise<PlanSplit> {
    const filasCrudas = await this.servicioDataset.listarImagenesParaEntrenar(opciones.clases);
    const fraccionVal = opciones.fraccionVal ?? FRACCION_VAL_DEFECTO;
    const semilla = opciones.semilla ?? SEMILLA_DEFECTO;

    // Split por grupo planta/fecha (no por imagen): con cámara fija, frames del mismo día son
    // casi idénticos — mezclarlos entre train y val infla el mAP con memorización, no generalización.
    let filas: FilaConGrupo[] = filasCrudas.map((fila) => ({
      fila,
      grupo: `${fila.planta ?? "sueltas"}|${fila.fecha ?? "sinfecha"}`,
    }));

    let advertencia: string | null = null;
    if (new Set(filas.map((f) => f.grupo)).size <= 1) {
      // Un solo día no da con qué partir train/val por grupo. Fallback a split por imagen
      // individual para no bloquear una primera corrida chica — el val resultante no es un
      // held-out real (frames casi idénticos pueden caer a ambos lados) y el mAP va a ser
      // optimista; hace falta revisar más de un día para que el split por grupo tenga sentido.
      advertencia =
        "Todas las imágenes elegibles son del mismo día — el split cayó a nivel imagen, no día. " +
        "El mAP de validación va a ser optimista (posible memorización de frames casi idénticos). " +
        "Revisá imágenes de al menos otro día para un split real.";
      filas = filas.map(({ fila }) => ({ fila, grupo: fila.imagenId }));
    }

    const grupos = new Set(filas.map((f) => f.grupo));
    const gruposVal = new Set<string>();
    for (const grupo of grupos) {
      if (fraccionDeterministica(grupo, semilla) < fraccionVal) gruposVal.add(grupo);
    }

    return { filas, gruposVal, fraccionVal, semilla, advertencia };
  }

  private resumirSplit(plan: PlanSplit): ResumenSplit {
    let trainImagenes = 0;
    let trainCajas = 0;
    let valImagenes = 0;
    let valCajas = 0;

    for (const { fila, grupo } of plan.filas) {
      const cajasValidas = fila.cajas.filter((caja) => normalizarCaja(caja, fila.ancho, fila.alto) !== null).length;
      if (plan.gruposVal.has(grupo)) {
        valImagenes += 1;
        valCajas += cajasValidas;
      } else {
        trainImagenes += 1;
        trainCajas += cajasValidas;
      }
    }

    return {
      totalImagenes: plan.filas.length,
      totalCajas: trainCajas + valCajas,
      train: { imagenes: trainImagenes, cajas: trainCajas },
      val: { imagenes: valImagenes, cajas: valCajas },
      grupos: new Set(plan.filas.map((f) => f.grupo)).size,
      gruposVal: plan.gruposVal.size,
      advertencia: plan.advertencia,
    };
  }
}

/** Fracción determinística en [0,1) a partir de un hash — mismo grupo + semilla siempre cae
 * del mismo lado del split, sin guardar el sorteo en ningún lado. */
function fraccionDeterministica(grupo: string, semilla: number): number {
  const hash = createHash("sha1").update(`${grupo}|${semilla}`).digest();
  return hash.readUInt32BE(0) / 0x1_0000_0000;
}

function generarDataYaml(id: string, clases: string[]): string {
  const nombres = clases.map((clase, indice) => `  ${indice}: ${clase}`).join("\n");
  return `path: /workspace/datasets/${id}\ntrain: images/train\nval: images/val\nnames:\n${nombres}\n`;
}

interface CajaNormalizada {
  clase: string;
  xc: string;
  yc: string;
  ancho: string;
  alto: string;
}

/** Clampea a [0,1] (el CSV de detectar.py redondea a 6 decimales, puede pasarse por poco) y
 * descarta cajas degeneradas (menos de ~2px de lado) que Ultralytics igual filtraría. */
function normalizarCaja(
  caja: { clase: string; xc: number; yc: number; ancho: number; alto: number },
  anchoImagen: number,
  altoImagen: number,
): CajaNormalizada | null {
  const xc = clamp01(caja.xc);
  const yc = clamp01(caja.yc);
  const ancho = clamp01(caja.ancho);
  const alto = clamp01(caja.alto);
  if (ancho * anchoImagen < TAMANO_MINIMO_PX || alto * altoImagen < TAMANO_MINIMO_PX) return null;
  return { clase: caja.clase, xc: xc.toFixed(6), yc: yc.toFixed(6), ancho: ancho.toFixed(6), alto: alto.toFixed(6) };
}

function clamp01(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}

async function enlazarOCopiar(origen: string, destino: string): Promise<void> {
  try {
    await link(origen, destino);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EXDEV") {
      await copyFile(origen, destino);
      return;
    }
    throw error;
  }
}
