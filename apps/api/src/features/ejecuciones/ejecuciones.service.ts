import { inject, injectable } from "inversify";
import type { FindOptionsWhere, Repository } from "typeorm";

import { Ejecucion } from "./ejecucion.entidad.js";
import { TIPOS } from "../../contenedor/tipos.js";

export interface FiltrosEjecuciones {
  imagenId?: string;
  acierto?: boolean;
}

@injectable()
export class ServicioEjecuciones {
  constructor(@inject(TIPOS.RepositorioEjecucion) private readonly repositorio: Repository<Ejecucion>) {}

  async listar(filtros: FiltrosEjecuciones): Promise<Ejecucion[]> {
    const where: FindOptionsWhere<Ejecucion> = {};
    if (filtros.imagenId) where.imagen = { id: filtros.imagenId };
    if (filtros.acierto !== undefined) where.acierto = filtros.acierto;

    return this.repositorio.find({
      where,
      relations: { imagen: true, preset: true },
      order: { creadoEn: "DESC" },
    });
  }
}
