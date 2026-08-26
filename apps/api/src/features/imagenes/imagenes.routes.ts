import { Router } from "express";
import type { Container } from "inversify";

import { ControladorImagenes } from "./imagenes.controller.js";
import { TIPOS } from "../../contenedor/tipos.js";

export function crearRutasImagenes(contenedor: Container): Router {
  const router = Router();
  const controlador = contenedor.get<ControladorImagenes>(TIPOS.ControladorImagenes);

  router.get("/", controlador.listar);
  router.post("/sincronizar", controlador.sincronizar);

  return router;
}
