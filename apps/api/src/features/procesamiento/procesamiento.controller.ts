import { inject, injectable } from "inversify";
import type { Request, Response } from "express";
import { z } from "zod";

import { ServicioProcesamiento } from "./procesamiento.service.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { esquemaPipeline } from "../../shared/contrato/pipeline.js";

const esquemaCuerpo = z.object({
  imagenId: z.string().min(1),
  pipeline: esquemaPipeline,
});

@injectable()
export class ControladorProcesamiento {
  constructor(@inject(TIPOS.ServicioProcesamiento) private readonly servicio: ServicioProcesamiento) {}

  procesar = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = esquemaCuerpo.parse(req.body);

    // `res.on("close")` (no `req.on("close")`: ese se dispara apenas Express
    // termina de leer el body, mucho antes de que la respuesta exista) sólo
    // indica desconexión real del cliente si la respuesta no llegó a terminar.
    const abortador = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) abortador.abort();
    });

    const buffer = await this.servicio.procesar(cuerpo.imagenId, cuerpo.pipeline, abortador.signal);
    res.set("Content-Type", "image/png");
    res.send(buffer);
  };
}
