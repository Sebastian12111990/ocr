import { Router } from "express";
import type { Container } from "inversify";

import { ControladorEjecuciones } from "./ejecuciones.controller.js";
import { TIPOS } from "../../contenedor/tipos.js";

export function crearRutasEjecuciones(contenedor: Container): Router {
  const router = Router();
  const controlador = contenedor.get<ControladorEjecuciones>(TIPOS.ControladorEjecuciones);

  router.get("/", controlador.listar);

  return router;
}
