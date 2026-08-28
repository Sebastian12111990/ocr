import { inject, injectable } from "inversify";

import { ClienteCv } from "../../infraestructura/cliente-cv.js";
import { ServicioImagenes } from "../imagenes/imagenes.service.js";
import type { Imagen } from "../imagenes/imagen.entidad.js";
import { TIPOS } from "../../contenedor/tipos.js";
import type { EtapaPipeline, Pipeline } from "../../shared/contrato/pipeline.js";
import { distanciaLevenshtein, normalizarTexto } from "../../shared/utils/texto.js";

export interface ResultadoOcrManual {
  imagen: Imagen;
  modo: "fijo" | "libre";
  etapas: EtapaPipeline[];
  textoDetectado: string;
  confianza: number;
  acierto: boolean;
  distanciaEdicion: number | null;
  duracionMs: number;
}

@injectable()
export class ServicioOcr {
  constructor(
    @inject(TIPOS.ClienteCv) private readonly clienteCv: ClienteCv,
    @inject(TIPOS.ServicioImagenes) private readonly servicioImagenes: ServicioImagenes,
  ) {}

  async ejecutar(
    imagenId: string,
    pipeline: Pipeline,
    signal?: AbortSignal,
  ): Promise<ResultadoOcrManual> {
    const inicio = Date.now();
    const imagen = await this.servicioImagenes.obtenerPorId(imagenId);
    const resultado = await this.clienteCv.ejecutarOcr(imagen.rutaRelativa, pipeline.etapas, signal);
    const duracionMs = Date.now() - inicio;

    const textoDetectado = normalizarTexto(resultado.texto);
    const patenteEsperada = imagen.patenteEsperada;
    const distanciaEdicion = patenteEsperada
      ? distanciaLevenshtein(textoDetectado, patenteEsperada)
      : null;
    const acierto = patenteEsperada !== null && textoDetectado === patenteEsperada;

    return {
      imagen,
      modo: pipeline.modo,
      etapas: pipeline.etapas,
      textoDetectado,
      confianza: resultado.confianza,
      acierto,
      distanciaEdicion,
      duracionMs,
    };
  }
}
