import { Router } from "express";
import type { Container } from "inversify";

import { ControladorEntrenamientos } from "./entrenamientos.controller.js";
import { TIPOS } from "../../contenedor/tipos.js";

export function crearRutasEntrenamientos(contenedor: Container): Router {
  const router = Router();
  const controlador = contenedor.get<ControladorEntrenamientos>(TIPOS.ControladorEntrenamientos);

  router.get("/", controlador.listar);
  router.get("/:id", controlador.obtenerDetalle);
  router.get("/:id/metricas", controlador.obtenerMetricas);

  return router;
}
