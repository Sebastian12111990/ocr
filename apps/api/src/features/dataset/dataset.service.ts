import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { inject, injectable } from "inversify";
import type { Repository } from "typeorm";

import {
  ClasificacionImagenDataset,
  type MotivoCasoDificil,
  type PerspectivaClasificacion,
} from "./clasificacion-imagen-dataset.entidad.js";
import type {
  CajaNormalizada,
  ClasificacionImagen,
  ImagenDataset,
  MuestraClasificada,
  MuestraDataset,
  OrigenImagenDataset,
  ResumenDataset,
} from "./dataset.types.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { entorno } from "../../config/env.js";
import { ErrorNoEncontrado, ErrorValidacion } from "../../shared/http/error-aplicacion.js";

const CARPETAS_ORIGEN: Record<OrigenImagenDataset, string> = {
  dataset: "dataset",
  sin_vehiculo: "sin_vehiculo",
  sin_deteccion: "sin_deteccion",
};

/** Solo nombres de archivo planos, sin separadores ni `..` — evita path traversal. */
const NOMBRE_ARCHIVO_VALIDO = /^[A-Za-z0-9_-]+\.JPG$/;

@injectable()
export class ServicioDataset {
  private readonly raiz = entorno.RUTA_DATASET_YOLO;

  constructor(
    @inject(TIPOS.RepositorioClasificacionDataset)
    private readonly repositorioClasificacion: Repository<ClasificacionImagenDataset>,
  ) {}

  async obtenerResumen(): Promise<ResumenDataset> {
    const [dataset, sinVehiculo, sinDeteccion, labels] = await Promise.all([
      this.contarJpg("dataset"),
      this.contarJpg("sin_vehiculo"),
      this.contarJpg("sin_deteccion"),
      this.listarLabels(),
    ]);

    let labelsVacios = 0;
    let labelsConContenido = 0;
    await Promise.all(
      labels.map(async (archivo) => {
        const info = await stat(path.join(this.raiz, "labels", archivo));
        if (info.size === 0) labelsVacios += 1;
        else labelsConContenido += 1;
      }),
    );

    return {
      dataset,
      sinVehiculo,
      sinDeteccion,
      // `sin_deteccion` es un subconjunto de imágenes que salieron de `dataset` (vehículo sin
      // patente) — no son imágenes originales adicionales, por eso no se suman acá.
      totalImagenes: dataset + sinVehiculo,
      labelsConContenido,
      labelsVacios,
      actualizadoEn: new Date().toISOString(),
    };
  }

  /** Todas las imágenes originales: `dataset` + `sin_vehiculo` combinadas (sin duplicar `sin_deteccion`, que es subconjunto de `dataset`). */
  async listarTodas(limite: number, desplazamiento = 0): Promise<MuestraDataset> {
    const [nombresDataset, nombresSinVehiculo] = await Promise.all([
      this.listarNombresCarpeta("dataset"),
      this.listarNombresCarpeta("sin_vehiculo"),
    ]);

    const combinados = [
      ...nombresDataset.map((nombre) => ({ nombre, origen: "dataset" as const })),
      ...nombresSinVehiculo.map((nombre) => ({ nombre, origen: "sin_vehiculo" as const })),
    ].sort((a, b) => a.nombre.localeCompare(b.nombre));

    const total = combinados.length;
    const pagina = combinados.slice(desplazamiento, desplazamiento + limite);
    const imagenes = await Promise.all(
      pagina.map(async (item) => ({
        nombre: item.nombre,
        origen: item.origen,
        cajas: await this.leerCajas(item.nombre),
      })),
    );
    return { imagenes, total };
  }

  async listarMuestra(
    origen: OrigenImagenDataset,
    limite: number,
    desplazamiento = 0,
    opciones: { soloConCaja?: boolean; soloSinCaja?: boolean; excluirClasificadas?: boolean } = {},
  ): Promise<MuestraDataset> {
    const nombres = await this.listarNombresCarpeta(origen);

    let candidatos: { nombre: string; cajas: CajaNormalizada[] | null }[] = nombres.map((nombre) => ({
      nombre,
      cajas: null,
    }));

    if (opciones.soloConCaja || opciones.soloSinCaja) {
      const conCajas = await Promise.all(
        candidatos.map(async (candidato) => ({ nombre: candidato.nombre, cajas: await this.leerCajas(candidato.nombre) })),
      );
      candidatos = opciones.soloSinCaja
        ? conCajas.filter((candidato) => candidato.cajas.length === 0)
        : conCajas.filter((candidato) => candidato.cajas.length > 0);
    }

    if (opciones.excluirClasificadas) {
      const clasificadas = await this.repositorioClasificacion.find({
        where: { origen },
        select: { nombreArchivo: true },
      });
      const nombresClasificados = new Set(clasificadas.map((c) => c.nombreArchivo));
      candidatos = candidatos.filter((candidato) => !nombresClasificados.has(candidato.nombre));
    }

    const total = candidatos.length;
    const pagina = candidatos.slice(desplazamiento, desplazamiento + limite);
    const imagenes = await Promise.all(
      pagina.map(async (candidato) => ({
        nombre: candidato.nombre,
        origen,
        cajas: candidato.cajas ?? (await this.leerCajas(candidato.nombre)),
      })),
    );
    return { imagenes, total };
  }

  async listarClasificaciones(perspectiva?: PerspectivaClasificacion): Promise<ClasificacionImagen[]> {
    const registros = await this.repositorioClasificacion.find({
      where: perspectiva ? { perspectiva } : {},
      order: { creadoEn: "DESC" },
    });
    return registros.map(aClasificacionRespuesta);
  }

  async listarClasificadas(
    perspectiva: PerspectivaClasificacion,
    limite: number,
    desplazamiento = 0,
  ): Promise<MuestraClasificada> {
    const [registros, total] = await this.repositorioClasificacion.findAndCount({
      where: { perspectiva },
      order: { creadoEn: "DESC" },
      skip: desplazamiento,
      take: limite,
    });

    const imagenes = await Promise.all(
      registros.map(async (registro) => ({
        nombre: registro.nombreArchivo,
        origen: registro.origen,
        cajas: await this.leerCajas(registro.nombreArchivo),
        clasificacionId: registro.id,
      })),
    );
    return { imagenes, total };
  }

  async clasificar(datos: {
    nombreArchivo: string;
    origen: OrigenImagenDataset;
    perspectiva: PerspectivaClasificacion;
    motivo?: MotivoCasoDificil | null;
  }): Promise<ClasificacionImagen> {
    if (!(datos.origen in CARPETAS_ORIGEN)) throw new ErrorValidacion(`Origen inválido: ${datos.origen}`);

    const existente = await this.repositorioClasificacion.findOne({
      where: { nombreArchivo: datos.nombreArchivo, origen: datos.origen },
    });

    const registro =
      existente ??
      this.repositorioClasificacion.create({ nombreArchivo: datos.nombreArchivo, origen: datos.origen });
    registro.perspectiva = datos.perspectiva;
    registro.motivo = datos.motivo ?? null;

    const guardado = await this.repositorioClasificacion.save(registro);
    return aClasificacionRespuesta(guardado);
  }

  async eliminarClasificacion(id: string): Promise<void> {
    const resultado = await this.repositorioClasificacion.delete({ id });
    if (!resultado.affected) throw new ErrorNoEncontrado(`No existe la clasificación: ${id}`);
  }

  async obtenerRutaImagen(origen: OrigenImagenDataset, nombre: string): Promise<string> {
    if (!(origen in CARPETAS_ORIGEN)) throw new ErrorValidacion(`Origen inválido: ${origen}`);
    if (!NOMBRE_ARCHIVO_VALIDO.test(nombre)) throw new ErrorValidacion("Nombre de archivo inválido");

    const ruta = path.join(this.raiz, CARPETAS_ORIGEN[origen], nombre);
    try {
      await stat(ruta);
    } catch {
      throw new ErrorNoEncontrado(`No existe la imagen: ${nombre}`);
    }
    return ruta;
  }

  private async contarJpg(carpeta: string): Promise<number> {
    const archivos = await readdir(path.join(this.raiz, carpeta));
    return archivos.filter((nombre) => nombre.toUpperCase().endsWith(".JPG")).length;
  }

  private async listarNombresCarpeta(origen: OrigenImagenDataset): Promise<string[]> {
    const carpeta = path.join(this.raiz, CARPETAS_ORIGEN[origen]);
    return (await readdir(carpeta)).filter((nombre) => nombre.toUpperCase().endsWith(".JPG")).sort();
  }

  private async listarLabels(): Promise<string[]> {
    const archivos = await readdir(path.join(this.raiz, "labels"));
    return archivos.filter((nombre) => nombre.endsWith(".txt") && nombre !== "classes.txt");
  }

  private async leerCajas(nombreImagen: string): Promise<CajaNormalizada[]> {
    const stem = nombreImagen.replace(/\.JPG$/i, "");
    const rutaLabel = path.join(this.raiz, "labels", `${stem}.txt`);

    let contenido: string;
    try {
      contenido = await readFile(rutaLabel, "utf-8");
    } catch {
      return [];
    }

    return contenido
      .trim()
      .split("\n")
      .filter((linea) => linea.trim().length > 0)
      .map((linea) => {
        const partes = linea.trim().split(/\s+/).map(Number);
        const [, xc, yc, ancho, alto] = partes;
        return { xc: xc ?? 0, yc: yc ?? 0, ancho: ancho ?? 0, alto: alto ?? 0 };
      });
  }
}

function aClasificacionRespuesta(registro: ClasificacionImagenDataset): ClasificacionImagen {
  return {
    id: registro.id,
    nombreArchivo: registro.nombreArchivo,
    origen: registro.origen,
    perspectiva: registro.perspectiva,
    motivo: registro.motivo,
    creadoEn: registro.creadoEn.toISOString(),
  };
}
