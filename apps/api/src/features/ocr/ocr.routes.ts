import { Router } from "express";
import type { Container } from "inversify";

import { ControladorOcr } from "./ocr.controller.js";
import { TIPOS } from "../../contenedor/tipos.js";

export function crearRutasOcr(contenedor: Container): Router {
  const router = Router();
  const controlador = contenedor.get<ControladorOcr>(TIPOS.ControladorOcr);

  router.post("/", controlador.ejecutar);

  return router;
}
