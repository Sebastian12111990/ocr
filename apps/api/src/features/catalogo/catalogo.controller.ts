import { inject, injectable } from "inversify";
import type { Request, Response } from "express";

import { ServicioCatalogo } from "./catalogo.service.js";
import { TIPOS } from "../../contenedor/tipos.js";

@injectable()
export class ControladorCatalogo {
  constructor(@inject(TIPOS.ServicioCatalogo) private readonly servicio: ServicioCatalogo) {}

  obtener = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.obtener());
  };
}
