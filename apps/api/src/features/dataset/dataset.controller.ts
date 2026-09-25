import { inject, injectable } from "inversify";
import type { Request, Response } from "express";
import { z } from "zod";

import { ServicioDataset } from "./dataset.service.js";
import { ServicioProcesamientoDataset } from "./procesamiento-dataset.service.js";
import { TIPOS } from "../../contenedor/tipos.js";

const vistaValida = z.enum([
  "todas",
  "vehiculo_con_patente",
  "solo_patente",
  "vehiculo_sin_patente",
  "sin_deteccion",
  "pendiente",
  "aceptada",
  "descartada",
]);
const veredictoValido = z.enum(["correcta", "falso_positivo"]);
const fechaValida = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha debe ser YYYY-MM-DD");

const esquemaResumen = z.object({
  planta: z.string().min(1).optional(),
  fechaDesde: fechaValida.optional(),
  fechaHasta: fechaValida.optional(),
  etiqueta: z.string().min(1).optional(),
  sinEtiqueta: z.string().min(1).optional(),
});

const esquemaListarImagenes = z.object({
  vista: vistaValida.default("todas"),
  planta: z.string().min(1).optional(),
  fechaDesde: fechaValida.optional(),
  fechaHasta: fechaValida.optional(),
  etiqueta: z.string().min(1).optional(),
  sinEtiqueta: z.string().min(1).optional(),
  confianzaMin: z.coerce.number().min(0).max(1).optional(),
  confianzaMax: z.coerce.number().min(0).max(1).optional(),
  confianzaClase: z.string().min(1).optional(),
  cursor: z.string().min(1).optional(),
  limite: z.coerce.number().int().min(1).max(100).default(24),
});

const esquemaAceptarPorConfianza = z.object({
  clase: z.string().min(1).default("patente"),
  confianzaMin: z.coerce.number().min(0).max(1),
  confianzaMax: z.coerce.number().min(0).max(1).optional(),
  planta: z.string().min(1).optional(),
  fechaDesde: fechaValida.optional(),
  fechaHasta: fechaValida.optional(),
});

const esquemaAceptarTodas = z.object({
  vista: vistaValida.optional(),
  planta: z.string().min(1).optional(),
  fechaDesde: fechaValida.optional(),
  fechaHasta: fechaValida.optional(),
  etiqueta: z.string().min(1).optional(),
});

const esquemaDescartarPorForma = z.object({
  clase: z.string().min(1).default("patente"),
  relacionMin: z.coerce.number().min(0),
  relacionMax: z.coerce.number().min(0),
  confianzaMax: z.coerce.number().min(0).max(1).optional(),
  planta: z.string().min(1).optional(),
  fechaDesde: fechaValida.optional(),
  fechaHasta: fechaValida.optional(),
});

const esquemaDescartarPorTamanoRelativo = z.object({
  clase: z.string().min(1).default("patente"),
  relacionMaxima: z.coerce.number().min(0).max(1),
  anchoMaximoPx: z.coerce.number().min(1).optional(),
  altoMaximoPx: z.coerce.number().min(1).optional(),
  planta: z.string().min(1).optional(),
  fechaDesde: fechaValida.optional(),
  fechaHasta: fechaValida.optional(),
});

const esquemaEstadisticasTamano = z.object({
  clase: z.string().min(1).default("patente"),
  planta: z.string().min(1).optional(),
  fechaDesde: fechaValida.optional(),
  fechaHasta: fechaValida.optional(),
});

const esquemaParametroId = z.object({ id: z.string().uuid() });
const esquemaParametroEtiqueta = z.object({ id: z.string().uuid(), clave: z.string().min(1).max(64) });
const esquemaAsignarEtiqueta = z.object({ nota: z.string().max(500).nullable().optional() });
const esquemaFijarVeredicto = z.object({ veredicto: veredictoValido.nullable() });

const esquemaIniciarProcesamiento = z.object({
  planta: z.string().min(1),
  fechaDesde: fechaValida,
  fechaHasta: fechaValida,
  modelo: z.string().min(1).optional(),
});

const esquemaListarFechas = z.object({ planta: z.string().min(1) });

@injectable()
export class ControladorDataset {
  constructor(
    @inject(TIPOS.ServicioDataset) private readonly servicio: ServicioDataset,
    @inject(TIPOS.ServicioProcesamientoDataset) private readonly servicioProcesamiento: ServicioProcesamientoDataset,
  ) {}

  obtenerResumen = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaResumen.parse(req.query);
    res.json(await this.servicio.obtenerResumen(filtros));
  };

  iniciarProcesamiento = async (req: Request, res: Response): Promise<void> => {
    const datos = esquemaIniciarProcesamiento.parse(req.body);
    res.status(202).json(await this.servicioProcesamiento.iniciarProcesamiento(datos));
  };

  obtenerEstadoProcesamiento = async (_req: Request, res: Response): Promise<void> => {
    res.json(this.servicioProcesamiento.obtenerEstado());
  };

  listarModelos = async (_req: Request, res: Response): Promise<void> => {
    res.json(this.servicioProcesamiento.listarModelos());
  };

  listarTiposEtiqueta = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.listarTiposEtiqueta());
  };

  listarFechas = async (req: Request, res: Response): Promise<void> => {
    const { planta } = esquemaListarFechas.parse(req.query);
    res.json(await this.servicio.listarFechas(planta));
  };

  listarImagenes = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaListarImagenes.parse(req.query);
    res.json(await this.servicio.listarImagenes(filtros));
  };

  obtenerArchivo = async (req: Request, res: Response): Promise<void> => {
    const { id } = esquemaParametroId.parse(req.params);
    const ruta = await this.servicio.obtenerRutaImagen(id);
    // El header va en `headers` (no `res.set` antes del sendFile): así "send" solo lo aplica
    // cuando el archivo se sirve con éxito — si se aplicara siempre, un 404 transitorio
    // quedaría cacheado por el navegador durante 7 días por el "immutable".
    res.sendFile(ruta, { headers: { "Cache-Control": "public, max-age=604800, immutable" } }, (err: unknown) => {
      if (err && !res.headersSent) res.status(404).json({ error: "No se pudo leer la imagen" });
    });
  };

  asignarEtiqueta = async (req: Request, res: Response): Promise<void> => {
    const { id, clave } = esquemaParametroEtiqueta.parse(req.params);
    const { nota } = esquemaAsignarEtiqueta.parse(req.body ?? {});
    await this.servicio.asignarEtiqueta(id, clave, nota ?? null);
    res.status(204).send();
  };

  quitarEtiqueta = async (req: Request, res: Response): Promise<void> => {
    const { id, clave } = esquemaParametroEtiqueta.parse(req.params);
    await this.servicio.quitarEtiqueta(id, clave);
    res.status(204).send();
  };

  fijarVeredicto = async (req: Request, res: Response): Promise<void> => {
    const { id } = esquemaParametroId.parse(req.params);
    const { veredicto } = esquemaFijarVeredicto.parse(req.body);
    await this.servicio.fijarVeredicto(id, veredicto);
    res.status(204).send();
  };

  previsualizarAceptarPorConfianza = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaAceptarPorConfianza.parse(req.query);
    res.json(await this.servicio.previsualizarAceptarPorConfianza(filtros));
  };

  aceptarPorConfianza = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaAceptarPorConfianza.parse(req.body);
    res.json(await this.servicio.aceptarPorConfianza(filtros));
  };

  previsualizarAceptarTodas = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaAceptarTodas.parse(req.query);
    res.json(await this.servicio.previsualizarAceptarTodas(filtros));
  };

  aceptarTodas = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaAceptarTodas.parse(req.body);
    res.json(await this.servicio.aceptarTodas(filtros));
  };

  previsualizarDescartarPorForma = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaDescartarPorForma.parse(req.query);
    res.json(await this.servicio.previsualizarDescartarPorForma(filtros));
  };

  listarImagenesDescartarPorForma = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaDescartarPorForma.parse(req.query);
    res.json(await this.servicio.listarImagenesDescartarPorForma(filtros));
  };

  descartarPorForma = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaDescartarPorForma.parse(req.body);
    res.json(await this.servicio.descartarPorForma(filtros));
  };

  previsualizarDescartarPorTamanoRelativo = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaDescartarPorTamanoRelativo.parse(req.query);
    res.json(await this.servicio.previsualizarDescartarPorTamanoRelativo(filtros));
  };

  listarImagenesDescartarPorTamanoRelativo = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaDescartarPorTamanoRelativo.parse(req.query);
    res.json(await this.servicio.listarImagenesDescartarPorTamanoRelativo(filtros));
  };

  descartarPorTamanoRelativo = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaDescartarPorTamanoRelativo.parse(req.body);
    res.json(await this.servicio.descartarPorTamanoRelativo(filtros));
  };

  obtenerEstadisticasTamano = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaEstadisticasTamano.parse(req.query);
    res.json(await this.servicio.obtenerEstadisticasTamano(filtros));
  };

  previsualizarNoIncluidasPorTamanoRelativo = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaDescartarPorTamanoRelativo.parse(req.query);
    res.json(await this.servicio.previsualizarNoIncluidasPorTamanoRelativo(filtros));
  };

  listarImagenesNoIncluidasPorTamanoRelativo = async (req: Request, res: Response): Promise<void> => {
    const filtros = esquemaDescartarPorTamanoRelativo.parse(req.query);
    res.json(await this.servicio.listarImagenesNoIncluidasPorTamanoRelativo(filtros));
  };
}
