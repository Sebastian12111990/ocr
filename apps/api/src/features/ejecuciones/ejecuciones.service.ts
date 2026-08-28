import { inflateSync } from "node:zlib";

import { inject, injectable } from "inversify";
import type { Repository } from "typeorm";

import { CandidatoEjecucion } from "./candidato-ejecucion.entidad.js";
import { Ejecucion } from "./ejecucion.entidad.js";
import type {
  DetalleEjecucion,
  ResultadoGuardarEjecucion,
  ResumenEjecucion,
  SolicitudGuardarEjecucion,
} from "./ejecuciones.types.js";
import { Imagen } from "../imagenes/imagen.entidad.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { ErrorConflicto, ErrorNoEncontrado, ErrorValidacion } from "../../shared/http/error-aplicacion.js";
import { calcularCoincidencia, distanciaLevenshtein, normalizarTexto } from "../../shared/utils/texto.js";

export interface FiltrosEjecuciones {
  imagenId?: string;
  acierto?: boolean;
}

@injectable()
export class ServicioEjecuciones {
  constructor(@inject(TIPOS.RepositorioEjecucion) private readonly repositorio: Repository<Ejecucion>) {}

  async listar(filtros: FiltrosEjecuciones): Promise<ResumenEjecucion[]> {
    const consulta = this.repositorio
      .createQueryBuilder("ejecucion")
      .innerJoin("ejecucion.imagen", "imagen")
      .innerJoin("ejecucion.candidatos", "candidato")
      .select("ejecucion.id", "id")
      .addSelect("imagen.id", "imagenId")
      .addSelect("imagen.nombreArchivo", "nombreArchivo")
      .addSelect("ejecucion.patenteEsperada", "patenteEsperada")
      .addSelect("ejecucion.modo", "modo")
      .addSelect("ejecucion.pipelineVersion", "pipelineVersion")
      .addSelect("ejecucion.creadoEn", "creadoEn")
      .addSelect("ejecucion.mejorCoincidencia", "mejorCoincidencia")
      .addSelect("COUNT(candidato.id)::int", "candidatosGuardados")
      .where("ejecucion.imagenProcesadaPng IS NOT NULL")
      .andWhere("ejecucion.mejorCoincidencia IS NOT NULL")
      .andWhere("ejecucion.patenteEsperada IS NOT NULL")
      .groupBy("ejecucion.id")
      .addGroupBy("imagen.id")
      .orderBy("ejecucion.creadoEn", "DESC");

    if (filtros.imagenId) consulta.andWhere("imagen.id = :imagenId", { imagenId: filtros.imagenId });
    if (filtros.acierto !== undefined) consulta.andWhere("ejecucion.acierto = :acierto", { acierto: filtros.acierto });

    const filas = await consulta.getRawMany<{
      id: string;
      imagenId: string;
      nombreArchivo: string;
      patenteEsperada: string;
      modo: ResumenEjecucion["modo"];
      pipelineVersion: number | string;
      creadoEn: Date;
      mejorCoincidencia: number | string;
      candidatosGuardados: number | string;
    }>();

    return filas.map((fila) => ({
      id: fila.id,
      imagen: {
        id: fila.imagenId,
        nombreArchivo: fila.nombreArchivo,
      },
      patenteEsperada: fila.patenteEsperada,
      modo: fila.modo,
      pipelineVersion: Number(fila.pipelineVersion),
      creadoEn: fila.creadoEn,
      mejorCoincidencia: Number(fila.mejorCoincidencia),
      candidatosGuardados: Number(fila.candidatosGuardados),
    }));
  }

  async obtenerDetalle(id: string): Promise<DetalleEjecucion> {
    const ejecucion = await this.repositorio
      .createQueryBuilder("ejecucion")
      .innerJoinAndSelect("ejecucion.imagen", "imagen")
      .addSelect("ejecucion.imagenProcesadaPng")
      .where("ejecucion.id = :id", { id })
      .getOne();

    if (!ejecucion) throw new ErrorNoEncontrado(`No existe la ejecución: ${id}`);
    if (
      ejecucion.patenteEsperada === null
      || ejecucion.mejorCoincidencia === null
      || ejecucion.imagenProcesadaPng === null
    ) {
      throw new ErrorConflicto("La ejecución existe, pero no contiene una captura restaurable", {
        codigo: "EJECUCION_LEGACY_INCOMPLETA",
      });
    }
    if (ejecucion.pipelineVersion !== 1) {
      throw new ErrorConflicto("La versión del pipeline guardado no es compatible", {
        codigo: "PIPELINE_VERSION_NO_SOPORTADA",
        pipelineVersion: ejecucion.pipelineVersion,
      });
    }

    const entidadesCandidato = await this.repositorio.manager
      .getRepository(CandidatoEjecucion)
      .createQueryBuilder("candidato")
      .innerJoin("candidato.ejecucion", "ejecucion")
      .addSelect("candidato.imagenPng")
      .where("ejecucion.id = :id", { id })
      .orderBy("candidato.orden", "ASC")
      .getMany();

    if (entidadesCandidato.length === 0) {
      throw new ErrorConflicto("La ejecución existe, pero no contiene candidatos restaurables", {
        codigo: "EJECUCION_LEGACY_INCOMPLETA",
      });
    }

    const candidatos = entidadesCandidato.map((candidato) => ({
      id: candidato.id,
      orden: candidato.orden,
      caja: {
        x: candidato.x,
        y: candidato.y,
        ancho: candidato.ancho,
        alto: candidato.alto,
        angulo: candidato.angulo,
      },
      area: candidato.area,
      texto: candidato.texto,
      confianza: candidato.confianza,
      coincidencia: candidato.coincidencia,
      imagenPngBase64: candidato.imagenPng.toString("base64"),
    }));

    return {
      id: ejecucion.id,
      creadoEn: ejecucion.creadoEn,
      imagen: {
        id: ejecucion.imagen.id,
        nombreArchivo: ejecucion.imagen.nombreArchivo,
        ancho: ejecucion.imagen.ancho,
        alto: ejecucion.imagen.alto,
      },
      patenteEsperada: ejecucion.patenteEsperada,
      pipelineVersion: ejecucion.pipelineVersion,
      pipeline: {
        modo: ejecucion.modo,
        etapas: ejecucion.etapas,
      },
      resultadoOcr: {
        textoDetectado: ejecucion.textoDetectado,
        confianza: ejecucion.confianza,
        acierto: ejecucion.acierto,
        distanciaEdicion: ejecucion.distanciaEdicion,
        duracionMs: ejecucion.duracionMs,
      },
      mejorCoincidencia: ejecucion.mejorCoincidencia,
      imagenProcesadaPngBase64: ejecucion.imagenProcesadaPng.toString("base64"),
      candidatos,
    };
  }

  async guardar(solicitud: SolicitudGuardarEjecucion): Promise<ResultadoGuardarEjecucion> {
    const imagen = await this.repositorio.manager.getRepository(Imagen).findOne({
      where: { id: solicitud.imagenId },
    });
    if (!imagen) throw new ErrorValidacion(`No existe la imagen: ${solicitud.imagenId}`);

    const patenteEsperada = imagen.patenteEsperada;
    if (!patenteEsperada) throw new ErrorValidacion("La imagen no tiene una patente esperada para comparar");

    const candidatosValidos = solicitud.candidatos.flatMap((candidato, orden) => {
      const texto = normalizarTexto(candidato.texto ?? "");
      const coincidencia = calcularCoincidencia(texto, patenteEsperada);
      if (coincidencia < 20) return [];
      if (!candidato.imagenPngBase64) {
        throw new ErrorValidacion(`El candidato ${orden + 1} no incluye su recorte PNG`);
      }
      return [{ candidato, coincidencia, orden, texto }];
    });

    if (candidatosValidos.length === 0) {
      throw new ErrorValidacion("Se requiere al menos un candidato con coincidencia igual o superior al 20%");
    }

    const imagenProcesadaPng = decodificarPng(
      solicitud.imagenProcesadaPngBase64,
      "imagen procesada",
      15 * 1024 * 1024,
    );
    const textoDetectado = normalizarTexto(solicitud.resultadoOcr.textoDetectado ?? "");
    const distanciaEdicion = distanciaLevenshtein(textoDetectado, patenteEsperada);
    const mejorCoincidencia = Math.max(...candidatosValidos.map(({ coincidencia }) => coincidencia));

    return this.repositorio.manager.transaction(async (administrador) => {
      const repositorioEjecucion = administrador.getRepository(Ejecucion);
      const repositorioCandidato = administrador.getRepository(CandidatoEjecucion);
      const ejecucion = await repositorioEjecucion.save(repositorioEjecucion.create({
        imagen,
        preset: null,
        modo: solicitud.pipeline.modo,
        etapas: solicitud.pipeline.etapas,
        pipelineVersion: 1,
        patenteEsperada,
        textoDetectado,
        confianza: solicitud.resultadoOcr.confianza,
        acierto: textoDetectado === patenteEsperada,
        distanciaEdicion,
        duracionMs: solicitud.resultadoOcr.duracionMs,
        mejorCoincidencia,
        imagenProcesadaPng,
      }));

      const entidades = candidatosValidos.map(({ candidato, coincidencia, orden, texto }) =>
        repositorioCandidato.create({
          ejecucion,
          orden,
          x: candidato.caja.x,
          y: candidato.caja.y,
          ancho: candidato.caja.ancho,
          alto: candidato.caja.alto,
          angulo: candidato.caja.angulo,
          area: candidato.area,
          texto,
          confianza: candidato.confianza,
          coincidencia,
          imagenPng: decodificarPng(
            candidato.imagenPngBase64!,
            `candidato ${orden + 1}`,
            5 * 1024 * 1024,
          ),
        }),
      );
      await repositorioCandidato.save(entidades);

      return {
        id: ejecucion.id,
        creadoEn: ejecucion.creadoEn,
        mejorCoincidencia,
        candidatosGuardados: entidades.length,
      };
    });
  }
}

function decodificarPng(base64: string, etiqueta: string, maximoBytes: number): Buffer {
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new ErrorValidacion(`El archivo de ${etiqueta} no contiene Base64 válido`);
  }
  const buffer = Buffer.from(base64, "base64");
  if (buffer.toString("base64") !== base64) {
    throw new ErrorValidacion(`El archivo de ${etiqueta} no contiene Base64 canónico`);
  }
  if (buffer.length > maximoBytes) {
    throw new ErrorValidacion(`El archivo de ${etiqueta} supera el tamaño máximo permitido`);
  }
  validarPng(buffer, etiqueta);
  return buffer;
}

const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAXIMO_DESCOMPRIMIDO = 100 * 1024 * 1024;
const TABLA_CRC32 = Array.from({ length: 256 }, (_, indice) => {
  let crc = indice;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(datos: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of datos) crc = TABLA_CRC32[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngInvalido(etiqueta: string, detalle?: string): never {
  throw new ErrorValidacion(
    `El archivo de ${etiqueta} no es un PNG válido${detalle ? `: ${detalle}` : ""}`,
  );
}

function validarPng(buffer: Buffer, etiqueta: string): void {
  if (buffer.length < 45 || !buffer.subarray(0, FIRMA_PNG.length).equals(FIRMA_PNG)) {
    pngInvalido(etiqueta, "firma ausente");
  }

  let desplazamiento = FIRMA_PNG.length;
  let ancho = 0;
  let alto = 0;
  let profundidadBits = 0;
  let tipoColor = -1;
  let ihdrVisto = false;
  let plteVisto = false;
  let idatVisto = false;
  let grupoIdatTerminado = false;
  let iendVisto = false;
  const bloquesIdat: Buffer[] = [];

  while (desplazamiento < buffer.length) {
    if (desplazamiento + 12 > buffer.length) pngInvalido(etiqueta, "chunk incompleto");
    const longitud = buffer.readUInt32BE(desplazamiento);
    const inicioTipo = desplazamiento + 4;
    const inicioDatos = inicioTipo + 4;
    const finDatos = inicioDatos + longitud;
    const finChunk = finDatos + 4;
    if (finDatos < inicioDatos || finChunk > buffer.length) pngInvalido(etiqueta, "longitud de chunk inválida");

    const tipo = buffer.subarray(inicioTipo, inicioDatos).toString("ascii");
    if (!/^[A-Za-z]{4}$/.test(tipo)) pngInvalido(etiqueta, "tipo de chunk inválido");
    const crcEsperado = buffer.readUInt32BE(finDatos);
    const crcCalculado = crc32(buffer.subarray(inicioTipo, finDatos));
    if (crcCalculado !== crcEsperado) pngInvalido(etiqueta, `CRC inválido en ${tipo}`);

    if (!ihdrVisto && tipo !== "IHDR") pngInvalido(etiqueta, "IHDR no es el primer chunk");
    if (idatVisto && tipo !== "IDAT" && tipo !== "IEND") grupoIdatTerminado = true;

    if (tipo === "IHDR") {
      if (ihdrVisto || longitud !== 13 || desplazamiento !== FIRMA_PNG.length) {
        pngInvalido(etiqueta, "IHDR inválido");
      }
      ihdrVisto = true;
      ancho = buffer.readUInt32BE(inicioDatos);
      alto = buffer.readUInt32BE(inicioDatos + 4);
      profundidadBits = buffer[inicioDatos + 8]!;
      tipoColor = buffer[inicioDatos + 9]!;
      const compresion = buffer[inicioDatos + 10];
      const filtro = buffer[inicioDatos + 11];
      const entrelazado = buffer[inicioDatos + 12];
      if (ancho === 0 || alto === 0 || compresion !== 0 || filtro !== 0 || entrelazado !== 0) {
        pngInvalido(etiqueta, "cabecera no soportada");
      }
    } else if (tipo === "PLTE") {
      if (idatVisto || longitud === 0 || longitud % 3 !== 0 || longitud > 768) {
        pngInvalido(etiqueta, "paleta inválida");
      }
      plteVisto = true;
    } else if (tipo === "IDAT") {
      if (grupoIdatTerminado || iendVisto) pngInvalido(etiqueta, "chunks IDAT no consecutivos");
      idatVisto = true;
      bloquesIdat.push(buffer.subarray(inicioDatos, finDatos));
    } else if (tipo === "IEND") {
      if (longitud !== 0 || !idatVisto || finChunk !== buffer.length) pngInvalido(etiqueta, "IEND inválido");
      iendVisto = true;
    } else if ((buffer[inicioTipo]! & 0x20) === 0) {
      pngInvalido(etiqueta, `chunk crítico desconocido ${tipo}`);
    }

    desplazamiento = finChunk;
  }

  if (!ihdrVisto || !idatVisto || !iendVisto) pngInvalido(etiqueta, "faltan chunks obligatorios");

  const configuracionesColor: Record<number, { canales: number; profundidades: number[] }> = {
    0: { canales: 1, profundidades: [1, 2, 4, 8, 16] },
    2: { canales: 3, profundidades: [8, 16] },
    3: { canales: 1, profundidades: [1, 2, 4, 8] },
    4: { canales: 2, profundidades: [8, 16] },
    6: { canales: 4, profundidades: [8, 16] },
  };
  const configuracion = configuracionesColor[tipoColor];
  if (!configuracion || !configuracion.profundidades.includes(profundidadBits)) {
    pngInvalido(etiqueta, "tipo de color o profundidad inválidos");
  }
  if (tipoColor === 3 && !plteVisto) pngInvalido(etiqueta, "imagen indexada sin paleta");

  const bytesPorFila = Math.ceil((ancho * configuracion.canales * profundidadBits) / 8);
  const longitudEsperada = alto * (bytesPorFila + 1);
  if (!Number.isSafeInteger(longitudEsperada) || longitudEsperada > MAXIMO_DESCOMPRIMIDO) {
    pngInvalido(etiqueta, "dimensiones excesivas");
  }

  let pixeles: Buffer;
  try {
    pixeles = inflateSync(Buffer.concat(bloquesIdat), { maxOutputLength: longitudEsperada });
  } catch {
    pngInvalido(etiqueta, "datos IDAT corruptos");
  }
  if (pixeles.length !== longitudEsperada) pngInvalido(etiqueta, "cantidad de píxeles inconsistente");
  for (let fila = 0; fila < alto; fila += 1) {
    if (pixeles[fila * (bytesPorFila + 1)]! > 4) pngInvalido(etiqueta, "filtro de fila inválido");
  }
}
