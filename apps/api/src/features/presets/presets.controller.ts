import { inject, injectable } from "inversify";
import type { Request, Response } from "express";
import { z } from "zod";

import { ServicioPresets } from "./presets.service.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { esquemaPipeline } from "../../shared/contrato/pipeline.js";

const esquemaCuerpo = z.object({
  nombre: z.string().min(1),
  pipeline: esquemaPipeline,
});

const esquemaParametroId = z.object({ id: z.string().min(1) });

@injectable()
export class ControladorPresets {
  constructor(@inject(TIPOS.ServicioPresets) private readonly servicio: ServicioPresets) {}

  listar = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.listar());
  };

  obtener = async (req: Request, res: Response): Promise<void> => {
    const { id } = esquemaParametroId.parse(req.params);
    res.json(await this.servicio.obtenerPorId(id));
  };

  crear = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = esquemaCuerpo.parse(req.body);
    res.status(201).json(await this.servicio.crear(cuerpo.nombre, cuerpo.pipeline));
  };

  actualizar = async (req: Request, res: Response): Promise<void> => {
    const { id } = esquemaParametroId.parse(req.params);
    const cuerpo = esquemaCuerpo.parse(req.body);
    res.json(await this.servicio.actualizar(id, cuerpo.nombre, cuerpo.pipeline));
  };

  eliminar = async (req: Request, res: Response): Promise<void> => {
    const { id } = esquemaParametroId.parse(req.params);
    await this.servicio.eliminar(id);
    res.status(204).send();
  };
}
