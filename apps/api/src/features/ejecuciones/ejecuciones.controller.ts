import { inject, injectable } from "inversify";
import type { Request, Response } from "express";
import { z } from "zod";

import { ServicioEjecuciones } from "./ejecuciones.service.js";
import { TIPOS } from "../../contenedor/tipos.js";

const esquemaConsulta = z.object({
  imagenId: z.string().min(1).optional(),
  acierto: z
    .enum(["true", "false"])
    .optional()
    .transform((valor) => (valor === undefined ? undefined : valor === "true")),
});

@injectable()
export class ControladorEjecuciones {
  constructor(@inject(TIPOS.ServicioEjecuciones) private readonly servicio: ServicioEjecuciones) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaConsulta.parse(req.query);
    res.json(await this.servicio.listar(filtros));
  };
}
