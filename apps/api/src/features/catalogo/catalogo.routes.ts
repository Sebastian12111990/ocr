import { Router } from "express";
import type { Container } from "inversify";

import { ControladorCatalogo } from "./catalogo.controller.js";
import { TIPOS } from "../../contenedor/tipos.js";

export function crearRutasCatalogo(contenedor: Container): Router {
  const router = Router();
  const controlador = contenedor.get<ControladorCatalogo>(TIPOS.ControladorCatalogo);

  router.get("/", controlador.obtener);

  return router;
}
