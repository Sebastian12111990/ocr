import { inject, injectable } from "inversify";

import { ClienteCv } from "../../infraestructura/cliente-cv.js";
import { ServicioImagenes } from "../imagenes/imagenes.service.js";
import { TIPOS } from "../../contenedor/tipos.js";
import type { Pipeline } from "../../shared/contrato/pipeline.js";

@injectable()
export class ServicioProcesamiento {
  constructor(
    @inject(TIPOS.ClienteCv) private readonly clienteCv: ClienteCv,
    @inject(TIPOS.ServicioImagenes) private readonly servicioImagenes: ServicioImagenes,
  ) {}

  async procesar(imagenId: string, pipeline: Pipeline, signal?: AbortSignal): Promise<Buffer> {
    const imagen = await this.servicioImagenes.obtenerPorId(imagenId);
    return this.clienteCv.procesar(imagen.rutaRelativa, pipeline.etapas, signal);
  }
}
