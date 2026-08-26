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
  const buffer = Buffer.from(base64, "base64");
  const firmaPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const inicioIhdrValido = buffer.length >= 33
    && buffer.readUInt32BE(8) === 13
    && buffer.subarray(12, 16).toString("ascii") === "IHDR"
    && buffer.readUInt32BE(16) > 0
    && buffer.readUInt32BE(20) > 0;
  const inicioIend = buffer.length - 12;
  const finIendValido = inicioIend >= 33
    && buffer.readUInt32BE(inicioIend) === 0
    && buffer.subarray(inicioIend + 4, inicioIend + 8).toString("ascii") === "IEND"
    && buffer.readUInt32BE(inicioIend + 8) === 0xae426082;
  if (!firmaPng.every((byte, indice) => buffer[indice] === byte) || !inicioIhdrValido || !finIendValido) {
    throw new ErrorValidacion(`El archivo de ${etiqueta} no es un PNG válido`);
  }
  if (buffer.length > maximoBytes) {
    throw new ErrorValidacion(`El archivo de ${etiqueta} supera el tamaño máximo permitido`);
  }
  return buffer;
}
