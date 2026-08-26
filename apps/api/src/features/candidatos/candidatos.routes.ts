import { Router } from "express";
import type { Container } from "inversify";

import { ControladorCandidatos } from "./candidatos.controller.js";
import { TIPOS } from "../../contenedor/tipos.js";

export function crearRutasCandidatos(contenedor: Container): Router {
  const router = Router();
  const controlador = contenedor.get<ControladorCandidatos>(TIPOS.ControladorCandidatos);

  router.post("/", controlador.obtener);

  return router;
}
