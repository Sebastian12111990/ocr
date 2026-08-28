import { inject, injectable } from "inversify";
import type { Request, Response } from "express";
import { z } from "zod";

import { ServicioEjecuciones } from "./ejecuciones.service.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { esquemaPipeline } from "../../shared/contrato/pipeline.js";

const esquemaConsulta = z.object({
  imagenId: z.string().uuid().optional(),
  acierto: z
    .enum(["true", "false"])
    .optional()
    .transform((valor) => (valor === undefined ? undefined : valor === "true")),
});
const esquemaParametroId = z.object({ id: z.string().uuid() });

const esquemaBase64 = z.string().min(1).max(20_000_000);
const esquemaCandidato = z.object({
  caja: z.object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    ancho: z.number().int().positive(),
    alto: z.number().int().positive(),
    angulo: z.number().finite(),
  }),
  area: z.number().finite().positive(),
  texto: z.string().max(256).nullable(),
  confianza: z.number().min(0).max(100).nullable(),
  coincidencia: z.number().min(0).max(100).nullable(),
  imagenPngBase64: esquemaBase64.nullable(),
});
const esquemaGuardar = z.object({
  imagenId: z.string().uuid(),
  pipeline: esquemaPipeline,
  resultadoOcr: z.object({
    textoDetectado: z.string().max(4096).nullable(),
    confianza: z.number().min(0).max(100).nullable(),
    duracionMs: z.number().int().nonnegative(),
  }),
  imagenProcesadaPngBase64: esquemaBase64,
  candidatos: z.array(esquemaCandidato).min(1).max(20),
});

@injectable()
export class ControladorEjecuciones {
  constructor(@inject(TIPOS.ServicioEjecuciones) private readonly servicio: ServicioEjecuciones) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaConsulta.parse(req.query);
    res.json(await this.servicio.listar(filtros));
  };

  obtenerDetalle = async (req: Request, res: Response): Promise<void> => {
    const { id } = esquemaParametroId.parse(req.params);
    res.json(await this.servicio.obtenerDetalle(id));
  };

  guardar = async (req: Request, res: Response): Promise<void> => {
    const solicitud = esquemaGuardar.parse(req.body);
    const resultado = await this.servicio.guardar(solicitud);
    res.status(201).json(resultado);
  };
}
