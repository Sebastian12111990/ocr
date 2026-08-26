import { Router } from "express";
import type { Container } from "inversify";

import { ControladorProcesamiento } from "./procesamiento.controller.js";
import { TIPOS } from "../../contenedor/tipos.js";

export function crearRutasProcesamiento(contenedor: Container): Router {
  const router = Router();
  const controlador = contenedor.get<ControladorProcesamiento>(TIPOS.ControladorProcesamiento);

  router.post("/", controlador.procesar);

  return router;
}
