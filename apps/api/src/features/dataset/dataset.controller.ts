import { inject, injectable } from "inversify";
import type { Request, Response } from "express";
import { z } from "zod";

import { ServicioDataset } from "./dataset.service.js";
import { TIPOS } from "../../contenedor/tipos.js";

const origenValido = z.enum(["dataset", "sin_vehiculo", "sin_deteccion"]);
const perspectivaValida = z.enum(["patente_sin_vehiculo", "descartada_sin_vehiculo", "caso_dificil"]);
const motivoValido = z.enum(["brillo", "suciedad", "otro"]);

/** Query params llegan como string — "false" debe parsear a `false`, no a `true`. */
const booleanoQuery = z
  .enum(["true", "false"])
  .optional()
  .default("false")
  .transform((valor) => valor === "true");

const esquemaMuestra = z.object({
  origen: origenValido.default("dataset"),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  desplazamiento: z.coerce.number().int().min(0).default(0),
  soloConCaja: booleanoQuery,
  soloSinCaja: booleanoQuery,
  excluirClasificadas: booleanoQuery,
});

const esquemaTodas = z.object({
  limite: z.coerce.number().int().min(1).max(100).default(20),
  desplazamiento: z.coerce.number().int().min(0).default(0),
});

const esquemaImagen = z.object({
  origen: origenValido,
  nombre: z.string().min(1).max(255),
});

const esquemaListarClasificaciones = z.object({
  perspectiva: perspectivaValida.optional(),
});

const esquemaListarClasificadas = z.object({
  perspectiva: perspectivaValida,
  limite: z.coerce.number().int().min(1).max(100).default(20),
  desplazamiento: z.coerce.number().int().min(0).default(0),
});

const esquemaCrearClasificacion = z
  .object({
    nombreArchivo: z.string().min(1).max(255),
    origen: origenValido,
    perspectiva: perspectivaValida,
    motivo: motivoValido.optional(),
  })
  .refine((datos) => datos.perspectiva !== "caso_dificil" || datos.motivo !== undefined, {
    message: "motivo es obligatorio para perspectiva 'caso_dificil'",
    path: ["motivo"],
  });

const esquemaParametroId = z.object({ id: z.string().uuid() });

@injectable()
export class ControladorDataset {
  constructor(@inject(TIPOS.ServicioDataset) private readonly servicio: ServicioDataset) {}

  obtenerResumen = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.obtenerResumen());
  };

  listarMuestra = async (req: Request, res: Response): Promise<void> => {
    const { origen, limite, desplazamiento, soloConCaja, soloSinCaja, excluirClasificadas } = esquemaMuestra.parse(
      req.query,
    );
    res.json(
      await this.servicio.listarMuestra(origen, limite, desplazamiento, { soloConCaja, soloSinCaja, excluirClasificadas }),
    );
  };

  listarTodas = async (req: Request, res: Response): Promise<void> => {
    const { limite, desplazamiento } = esquemaTodas.parse(req.query);
    res.json(await this.servicio.listarTodas(limite, desplazamiento));
  };

  obtenerImagen = async (req: Request, res: Response): Promise<void> => {
    const { origen, nombre } = esquemaImagen.parse(req.params);
    const ruta = await this.servicio.obtenerRutaImagen(origen, nombre);
    res.sendFile(ruta);
  };

  listarClasificaciones = async (req: Request, res: Response): Promise<void> => {
    const { perspectiva } = esquemaListarClasificaciones.parse(req.query);
    res.json(await this.servicio.listarClasificaciones(perspectiva));
  };

  listarClasificadas = async (req: Request, res: Response): Promise<void> => {
    const { perspectiva, limite, desplazamiento } = esquemaListarClasificadas.parse(req.query);
    res.json(await this.servicio.listarClasificadas(perspectiva, limite, desplazamiento));
  };

  crearClasificacion = async (req: Request, res: Response): Promise<void> => {
    const datos = esquemaCrearClasificacion.parse(req.body);
    res.status(201).json(await this.servicio.clasificar(datos));
  };

  eliminarClasificacion = async (req: Request, res: Response): Promise<void> => {
    const { id } = esquemaParametroId.parse(req.params);
    await this.servicio.eliminarClasificacion(id);
    res.status(204).send();
  };
}
