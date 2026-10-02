import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { inject, injectable } from "inversify";
import { Between, type Repository } from "typeorm";

import { entorno } from "../../config/env.js";
import { CLASE_PATENTE, CLASES_VEHICULO, ServicioDataset } from "./dataset.service.js";
import { ImagenDataset } from "./imagen-dataset.entidad.js";
import type { DatosIniciarProcesamiento, EstadoProcesamiento, FilaDeteccionCsv, ModeloDeteccion } from "./dataset.types.js";
import { EntrenamientoYolo } from "../entrenamientos/entrenamiento-yolo.entidad.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { ErrorConflicto, ErrorValidacion } from "../../shared/http/error-aplicacion.js";

interface ConfigModelo {
  archivo: string;
  etiqueta: string;
  /** --clases: filtra qué clases del modelo se guardan. null = guardar todas (modelos de una sola clase). */
  clases: string[] | null;
  /** --clase-como: renombra la clase detectada (para modelos fine-tuneados de una sola clase). */
  claseComo: string | null;
}

/** Catálogo de modelos que se pueden correr desde el botón "Procesar" — agregar uno acá alcanza. */
const MODELOS_DISPONIBLES: ConfigModelo[] = [
  { archivo: "license-plate-finetune-v1m.pt", etiqueta: "Patentes", clases: null, claseComo: CLASE_PATENTE },
  { archivo: "yolo11n.pt", etiqueta: "Vehículos (COCO)", clases: CLASES_VEHICULO, claseComo: null },
  {
    archivo: "patente-entrenamiento-real-01.pt",
    etiqueta: "Patentes (fine-tune propio, 2026-09-25)",
    clases: null,
    claseComo: CLASE_PATENTE,
  },
  {
    archivo: "patente-v4-20260926.pt",
    etiqueta: "Patentes v4 (fine-tune propio, 2026-09-26)",
    clases: null,
    claseComo: CLASE_PATENTE,
  },
];
const MODELO_DEFECTO = MODELOS_DISPONIBLES[0].archivo;

const CONTENEDOR_YOLO = "ocr-yolo";
/** apps/api/src/features/dataset -> raíz del repo: 5 niveles (ver services/yolo/runs). */
const DIRECTORIO_RUNS = path.resolve(import.meta.dirname, "../../../../../services/yolo/runs");

const ESTADO_INACTIVO: EstadoProcesamiento = {
  estado: "inactivo",
  planta: null,
  fechaDesde: null,
  fechaHasta: null,
  modelo: null,
  procesadas: 0,
  total: 0,
  detecciones: null,
  mensaje: null,
  entrenamientoId: null,
};

/**
 * Orquesta una corrida de detección bajo demanda desde la vista (planta + rango de fechas,
 * máximo un mes) — dispara `docker exec ocr-yolo python detectar.py --lista ...` y carga el CSV
 * resultante. Un solo job a la vez, estado en memoria: herramienta de un solo usuario, no hace
 * falta cola ni tabla de jobs. Cada corrida completa queda como fila en `entrenamiento_yolo`.
 */
@injectable()
export class ServicioProcesamientoDataset {
  private estado: EstadoProcesamiento = ESTADO_INACTIVO;
  /** Emite "cambio" con el estado nuevo cada vez que se actualiza — lo consume el servidor WS. */
  private readonly emisor = new EventEmitter();

  constructor(
    @inject(TIPOS.RepositorioImagenDataset) private readonly repositorioImagenes: Repository<ImagenDataset>,
    @inject(TIPOS.RepositorioEntrenamientoYolo)
    private readonly repositorioEntrenamientos: Repository<EntrenamientoYolo>,
    @inject(TIPOS.ServicioDataset) private readonly servicioDataset: ServicioDataset,
  ) {}

  obtenerEstado(): EstadoProcesamiento {
    return this.estado;
  }

  listarModelos(): ModeloDeteccion[] {
    return MODELOS_DISPONIBLES.map(({ archivo, etiqueta }) => ({ archivo, etiqueta }));
  }

  onCambio(listener: (estado: EstadoProcesamiento) => void): () => void {
    this.emisor.on("cambio", listener);
    return () => this.emisor.off("cambio", listener);
  }

  private actualizarEstado(estado: EstadoProcesamiento): void {
    this.estado = estado;
    this.emisor.emit("cambio", estado);
  }

  async iniciarProcesamiento(datos: DatosIniciarProcesamiento): Promise<EstadoProcesamiento> {
    if (this.estado.estado === "corriendo" || this.estado.estado === "cargando") {
      throw new ErrorConflicto("Ya hay un procesamiento en curso");
    }

    const { planta, fechaDesde, fechaHasta } = datos;
    const modeloElegido = datos.modelo ?? MODELO_DEFECTO;
    const config = MODELOS_DISPONIBLES.find((m) => m.archivo === modeloElegido);
    if (!config) throw new ErrorValidacion(`Modelo no reconocido: ${modeloElegido}`);

    if (fechaDesde > fechaHasta) throw new ErrorValidacion("fechaDesde no puede ser posterior a fechaHasta");
    if (fechaDesde.slice(0, 7) !== fechaHasta.slice(0, 7)) {
      throw new ErrorValidacion("El rango debe estar dentro de un mismo mes");
    }

    const imagenes = await this.repositorioImagenes.find({
      where: { planta, fecha: Between(fechaDesde, fechaHasta) },
      select: { rutaRelativa: true },
    });
    if (imagenes.length === 0) throw new ErrorValidacion("No hay imágenes indexadas en ese rango");

    await mkdir(DIRECTORIO_RUNS, { recursive: true });
    const nombreLista = `seleccion-${Date.now()}.txt`;
    await writeFile(path.join(DIRECTORIO_RUNS, nombreLista), imagenes.map((i) => i.rutaRelativa).join("\n"), "utf-8");

    this.actualizarEstado({
      estado: "corriendo",
      planta,
      fechaDesde,
      fechaHasta,
      modelo: config.archivo,
      procesadas: 0,
      total: imagenes.length,
      detecciones: null,
      mensaje: null,
      entrenamientoId: null,
    });

    this.ejecutar(nombreLista, config).catch((error: unknown) => {
      this.actualizarEstado({ ...this.estado, estado: "error", mensaje: (error as Error).message });
    });

    return this.estado;
  }

  private ejecutar(nombreLista: string, config: ConfigModelo): Promise<void> {
    const inicioMs = Date.now();
    return new Promise((resolve, reject) => {
      // PYTHONUNBUFFERED fuerza stdout sin buffer a nivel intérprete (no solo los prints con
      // flush=True) — sin esto el progreso puede llegar todo junto al final. Probado "-t"
      // (pseudo-tty) como alternativa y colgó el proceso esperando stdin (nunca hay "-i") — no usar.
      const args = [
        "exec",
        "-e",
        "PYTHONUNBUFFERED=1",
        CONTENEDOR_YOLO,
        "python",
        "detectar.py",
        config.archivo,
        "--lista",
        `runs/${nombreLista}`,
        "--device",
        entorno.YOLO_DEVICE,
      ];
      if (config.clases) args.push("--clases", config.clases.join(","));
      if (config.claseComo) args.push("--clase-como", config.claseComo);

      const proceso = spawn("docker", args);

      let bufferSalida = "";
      proceso.stdout.on("data", (chunk: Buffer) => {
        bufferSalida += chunk.toString();
        const patron = /\.\.\. (\d+)\/(\d+) procesadas/g;
        let ultima: RegExpExecArray | null = null;
        let coincidencia: RegExpExecArray | null;
        while ((coincidencia = patron.exec(bufferSalida))) ultima = coincidencia;
        if (ultima) {
          this.actualizarEstado({ ...this.estado, procesadas: Number(ultima[1]), total: Number(ultima[2]) });
        }
      });

      let salidaError = "";
      proceso.stderr.on("data", (chunk: Buffer) => {
        salidaError += chunk.toString();
      });

      proceso.on("error", (error) => {
        reject(
          new Error(`No se pudo ejecutar "docker exec": ${error.message}. ¿Está corriendo docker compose up -d yolo?`),
        );
      });

      proceso.on("exit", (codigo) => {
        if (codigo !== 0) {
          reject(new Error(`detectar.py terminó con error (código ${codigo}): ${salidaError.slice(-500)}`));
          return;
        }
        this.cargarResultado(config.archivo, inicioMs).then(resolve, reject);
      });
    });
  }

  private async cargarResultado(modelo: string, inicioMs: number): Promise<void> {
    this.actualizarEstado({ ...this.estado, estado: "cargando" });

    const nombreModelo = path.basename(modelo, ".pt");
    const rutaCsv = path.join(DIRECTORIO_RUNS, `detecciones-${nombreModelo}.csv`);
    const filas = await leerCsvDetecciones(rutaCsv);
    const imagenesConDeteccion = new Set(filas.map((fila) => fila.rutaRelativa)).size;

    const resultado = await this.servicioDataset.cargarDetecciones(filas, nombreModelo, { reemplazar: true });

    const entrenamiento = await this.repositorioEntrenamientos.save(
      this.repositorioEntrenamientos.create({
        nombre: `Sondeo bajo demanda — ${this.estado.planta} ${this.estado.fechaDesde}..${this.estado.fechaHasta}`,
        tipo: "sondeo",
        modeloBase: modelo,
        parametros: {
          planta: this.estado.planta,
          fechaDesde: this.estado.fechaDesde,
          fechaHasta: this.estado.fechaHasta,
          origen: "ui_bajo_demanda",
        },
        metricasFinales: null,
        totalImagenes: this.estado.total,
        imagenesConDeteccion,
        rutaPesos: null,
        duracionMs: Date.now() - inicioMs,
      }),
    );

    this.actualizarEstado({
      ...this.estado,
      estado: "listo",
      detecciones: resultado.cargadas,
      entrenamientoId: entrenamiento.id,
      mensaje:
        resultado.protegidas > 0
          ? `${resultado.protegidas} imágenes con veredicto humano se dejaron intactas, no se reemplazaron.`
          : null,
    });
  }
}

async function leerCsvDetecciones(rutaCsv: string): Promise<FilaDeteccionCsv[]> {
  const contenido = await readFile(rutaCsv, "utf-8");
  const lineas = contenido.trim().split("\n");
  const filas: FilaDeteccionCsv[] = [];
  for (let i = 1; i < lineas.length; i++) {
    const [rutaRelativa, , clase, confianza, xc, yc, ancho, alto] = lineas[i].split(",");
    if (!rutaRelativa) continue;
    filas.push({
      rutaRelativa,
      clase,
      confianza: Number(confianza),
      xc: Number(xc),
      yc: Number(yc),
      ancho: Number(ancho),
      alto: Number(alto),
    });
  }
  return filas;
}
