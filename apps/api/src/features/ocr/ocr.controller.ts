import { inject, injectable } from "inversify";
import type { Request, Response } from "express";
import { z } from "zod";

import { ServicioOcr } from "./ocr.service.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { esquemaPipeline } from "../../shared/contrato/pipeline.js";

const esquemaCuerpo = z.object({
  imagenId: z.string().min(1),
  pipeline: esquemaPipeline,
  presetId: z.string().min(1).nullish(),
});

@injectable()
export class ControladorOcr {
  constructor(@inject(TIPOS.ServicioOcr) private readonly servicio: ServicioOcr) {}

  ejecutar = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = esquemaCuerpo.parse(req.body);

    const abortador = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) abortador.abort();
    });

    const ejecucion = await this.servicio.ejecutar(
      cuerpo.imagenId,
      cuerpo.pipeline,
      cuerpo.presetId ?? null,
      abortador.signal,
    );
    res.status(201).json(ejecucion);
  };
}
