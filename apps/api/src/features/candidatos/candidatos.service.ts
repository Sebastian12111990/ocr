import { inject, injectable } from "inversify";

import { ClienteCv } from "../../infraestructura/cliente-cv.js";
import { ServicioImagenes } from "../imagenes/imagenes.service.js";
import { TIPOS } from "../../contenedor/tipos.js";
import type { Pipeline } from "../../shared/contrato/pipeline.js";
import { calcularCoincidencia, normalizarTexto } from "../../shared/utils/texto.js";
import type { Candidato } from "./candidatos.types.js";

const LIMITE_POR_DEFECTO = 5;

@injectable()
export class ServicioCandidatos {
  constructor(
    @inject(TIPOS.ClienteCv) private readonly clienteCv: ClienteCv,
    @inject(TIPOS.ServicioImagenes) private readonly servicioImagenes: ServicioImagenes,
  ) {}

  async obtener(
    imagenId: string,
    pipeline: Pipeline,
    limite: number = LIMITE_POR_DEFECTO,
    signal?: AbortSignal,
  ): Promise<Candidato[]> {
    const imagen = await this.servicioImagenes.obtenerPorId(imagenId);
    const crudos = await this.clienteCv.obtenerCandidatos(imagen.rutaRelativa, pipeline.etapas, limite, signal);

    return crudos.map((candidato) => {
      const texto = candidato.texto === null ? null : normalizarTexto(candidato.texto);
      const esperada = imagen.patenteEsperada;
      const coincidencia = texto !== null && esperada !== null
        ? calcularCoincidencia(texto, esperada)
        : null;

      return {
        caja: candidato.caja,
        area: candidato.area,
        texto,
        confianza: candidato.confianza,
        coincidencia,
        patenteEsperada: esperada,
        imagenPngBase64: candidato.imagen_png_base64,
      };
    });
  }
}
