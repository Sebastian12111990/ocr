import { inject, injectable } from "inversify";
import type { Repository } from "typeorm";

import { Preset } from "./preset.entidad.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { ErrorNoEncontrado } from "../../shared/http/error-aplicacion.js";
import type { Pipeline } from "../../shared/contrato/pipeline.js";

@injectable()
export class ServicioPresets {
  constructor(@inject(TIPOS.RepositorioPreset) private readonly repositorio: Repository<Preset>) {}

  async listar(): Promise<Preset[]> {
    return this.repositorio.find({ order: { actualizadoEn: "DESC" } });
  }

  async obtenerPorId(id: string): Promise<Preset> {
    const preset = await this.repositorio.findOneBy({ id });
    if (!preset) throw new ErrorNoEncontrado(`No existe el preset: ${id}`);
    return preset;
  }

  async crear(nombre: string, pipeline: Pipeline): Promise<Preset> {
    const preset = this.repositorio.create({ nombre, modo: pipeline.modo, etapas: pipeline.etapas });
    return this.repositorio.save(preset);
  }

  async actualizar(id: string, nombre: string, pipeline: Pipeline): Promise<Preset> {
    await this.obtenerPorId(id);
    await this.repositorio.update(id, { nombre, modo: pipeline.modo, etapas: pipeline.etapas });
    return this.obtenerPorId(id);
  }

  async eliminar(id: string): Promise<void> {
    await this.obtenerPorId(id);
    await this.repositorio.delete(id);
  }
}
