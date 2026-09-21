import { inject, injectable } from "inversify";
import type { Request, Response } from "express";
import { z } from "zod";

import { ServicioEntrenamientos } from "./entrenamientos.service.js";
import { TIPOS } from "../../contenedor/tipos.js";

const esquemaParametroId = z.object({ id: z.string().uuid() });

@injectable()
export class ControladorEntrenamientos {
  constructor(@inject(TIPOS.ServicioEntrenamientos) private readonly servicio: ServicioEntrenamientos) {}

  listar = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.listar());
  };

  obtenerDetalle = async (req: Request, res: Response): Promise<void> => {
    const { id } = esquemaParametroId.parse(req.params);
    res.json(await this.servicio.obtenerDetalle(id));
  };

  obtenerMetricas = async (req: Request, res: Response): Promise<void> => {
    const { id } = esquemaParametroId.parse(req.params);
    res.json(await this.servicio.obtenerMetricas(id));
  };
}
