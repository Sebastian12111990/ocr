import { Router } from "express";
import type { Container } from "inversify";

import { ControladorDataset } from "./dataset.controller.js";
import { TIPOS } from "../../contenedor/tipos.js";

export function crearRutasDataset(contenedor: Container): Router {
  const router = Router();
  const controlador = contenedor.get<ControladorDataset>(TIPOS.ControladorDataset);

  router.get("/resumen", controlador.obtenerResumen);
  router.get("/todas", controlador.listarTodas);
  router.get("/muestra", controlador.listarMuestra);
  router.get("/imagen/:origen/:nombre", controlador.obtenerImagen);
  router.get("/clasificaciones", controlador.listarClasificaciones);
  router.get("/clasificadas", controlador.listarClasificadas);
  router.post("/clasificaciones", controlador.crearClasificacion);
  router.delete("/clasificaciones/:id", controlador.eliminarClasificacion);

  return router;
}
