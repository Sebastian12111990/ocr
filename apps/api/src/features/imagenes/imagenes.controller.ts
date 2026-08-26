import { inject, injectable } from "inversify";
import type { Request, Response } from "express";

import { ServicioImagenes } from "./imagenes.service.js";
import { TIPOS } from "../../contenedor/tipos.js";

@injectable()
export class ControladorImagenes {
  constructor(@inject(TIPOS.ServicioImagenes) private readonly servicio: ServicioImagenes) {}

  listar = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.listar());
  };

  sincronizar = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.sincronizar());
  };
}
