import { inject, injectable } from "inversify";
import type { Repository } from "typeorm";

import { Ejecucion } from "../ejecuciones/ejecucion.entidad.js";
import { Preset } from "../presets/preset.entidad.js";
import { ClienteCv } from "../../infraestructura/cliente-cv.js";
import { ServicioImagenes } from "../imagenes/imagenes.service.js";
import { TIPOS } from "../../contenedor/tipos.js";
import type { Pipeline } from "../../shared/contrato/pipeline.js";
import { distanciaLevenshtein, normalizarTexto } from "../../shared/utils/texto.js";

@injectable()
export class ServicioOcr {
  constructor(
    @inject(TIPOS.ClienteCv) private readonly clienteCv: ClienteCv,
    @inject(TIPOS.ServicioImagenes) private readonly servicioImagenes: ServicioImagenes,
    @inject(TIPOS.RepositorioEjecucion) private readonly repositorioEjecucion: Repository<Ejecucion>,
    @inject(TIPOS.RepositorioPreset) private readonly repositorioPreset: Repository<Preset>,
  ) {}

  async ejecutar(
    imagenId: string,
    pipeline: Pipeline,
    presetId: string | null,
    signal?: AbortSignal,
  ): Promise<Ejecucion> {
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

    const preset = presetId ? await this.repositorioPreset.findOneBy({ id: presetId }) : null;

    const ejecucion = this.repositorioEjecucion.create({
      imagen,
      preset,
      modo: pipeline.modo,
      etapas: pipeline.etapas,
      textoDetectado,
      confianza: resultado.confianza,
      acierto,
      distanciaEdicion,
      duracionMs,
    });

    return this.repositorioEjecucion.save(ejecucion);
  }
}
