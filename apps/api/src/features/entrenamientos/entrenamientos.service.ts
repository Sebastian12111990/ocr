import { inject, injectable } from "inversify";
import type { Repository } from "typeorm";

import { EntrenamientoYolo } from "./entrenamiento-yolo.entidad.js";
import { MetricaEpoca } from "./metrica-epoca.entidad.js";
import type { DetalleEntrenamiento, MetricaEpocaRespuesta, ResumenEntrenamiento } from "./entrenamientos.types.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { ErrorNoEncontrado } from "../../shared/http/error-aplicacion.js";

@injectable()
export class ServicioEntrenamientos {
  constructor(
    @inject(TIPOS.RepositorioEntrenamientoYolo) private readonly repositorio: Repository<EntrenamientoYolo>,
  ) {}

  async listar(): Promise<ResumenEntrenamiento[]> {
    const entrenamientos = await this.repositorio.find({ order: { creadoEn: "DESC" } });
    return entrenamientos.map(aResumen);
  }

  async obtenerDetalle(id: string): Promise<DetalleEntrenamiento> {
    const entrenamiento = await this.repositorio.findOne({ where: { id } });
    if (!entrenamiento) throw new ErrorNoEncontrado(`No existe el entrenamiento: ${id}`);
    return {
      ...aResumen(entrenamiento),
      parametros: entrenamiento.parametros,
      rutaPesos: entrenamiento.rutaPesos,
    };
  }

  async obtenerMetricas(id: string): Promise<MetricaEpocaRespuesta[]> {
    const entrenamiento = await this.repositorio.findOne({ where: { id } });
    if (!entrenamiento) throw new ErrorNoEncontrado(`No existe el entrenamiento: ${id}`);

    const metricas = await this.repositorio.manager.getRepository(MetricaEpoca).find({
      where: { entrenamiento: { id } },
      order: { epoca: "ASC" },
    });

    return metricas.map((metrica) => ({
      epoca: metrica.epoca,
      boxLoss: metrica.boxLoss,
      clsLoss: metrica.clsLoss,
      dflLoss: metrica.dflLoss,
      map50: metrica.map50,
      map5095: metrica.map5095,
      precision: metrica.precision,
      recall: metrica.recall,
    }));
  }
}

function aResumen(entrenamiento: EntrenamientoYolo): ResumenEntrenamiento {
  return {
    id: entrenamiento.id,
    nombre: entrenamiento.nombre,
    tipo: entrenamiento.tipo,
    modeloBase: entrenamiento.modeloBase,
    totalImagenes: entrenamiento.totalImagenes,
    imagenesConDeteccion: entrenamiento.imagenesConDeteccion,
    metricasFinales: entrenamiento.metricasFinales,
    duracionMs: entrenamiento.duracionMs,
    creadoEn: entrenamiento.creadoEn,
  };
}
