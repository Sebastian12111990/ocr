import { Router } from "express";
import type { Container } from "inversify";

import { ControladorPresets } from "./presets.controller.js";
import { TIPOS } from "../../contenedor/tipos.js";

export function crearRutasPresets(contenedor: Container): Router {
  const router = Router();
  const controlador = contenedor.get<ControladorPresets>(TIPOS.ControladorPresets);

  router.get("/", controlador.listar);
  router.get("/:id", controlador.obtener);
  router.post("/", controlador.crear);
  router.put("/:id", controlador.actualizar);
  router.delete("/:id", controlador.eliminar);

  return router;
}
