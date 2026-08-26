import { inject, injectable } from "inversify";
import type { Request, Response } from "express";
import { z } from "zod";

import { ServicioCandidatos } from "./candidatos.service.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { esquemaPipeline } from "../../shared/contrato/pipeline.js";

const esquemaCuerpo = z.object({
  imagenId: z.string().min(1),
  pipeline: esquemaPipeline,
  limite: z.number().int().min(1).max(20).optional(),
});

@injectable()
export class ControladorCandidatos {
  constructor(@inject(TIPOS.ServicioCandidatos) private readonly servicio: ServicioCandidatos) {}

  obtener = async (req: Request, res: Response): Promise<void> => {
    const cuerpo = esquemaCuerpo.parse(req.body);

    const abortador = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) abortador.abort();
    });

    const candidatos = await this.servicio.obtener(
      cuerpo.imagenId,
      cuerpo.pipeline,
      cuerpo.limite,
      abortador.signal,
    );
    res.json({ candidatos });
  };
}
