import { Router } from "express";
import type { Container } from "inversify";

import { ControladorDataset } from "./dataset.controller.js";
import { TIPOS } from "../../contenedor/tipos.js";

export function crearRutasDataset(contenedor: Container): Router {
  const router = Router();
  const controlador = contenedor.get<ControladorDataset>(TIPOS.ControladorDataset);

  router.get("/resumen", controlador.obtenerResumen);
  router.get("/tipos-etiqueta", controlador.listarTiposEtiqueta);
  router.get("/fechas", controlador.listarFechas);
  router.get("/modelos", controlador.listarModelos);
  router.post("/procesos", controlador.iniciarProcesamiento);
  router.get("/procesos/actual", controlador.obtenerEstadoProcesamiento);
  router.get("/imagenes", controlador.listarImagenes);
  router.get("/imagenes/:id/archivo", controlador.obtenerArchivo);
  router.put("/imagenes/:id/etiquetas/:clave", controlador.asignarEtiqueta);
  router.delete("/imagenes/:id/etiquetas/:clave", controlador.quitarEtiqueta);
  router.patch("/detecciones/:id", controlador.fijarVeredicto);

  return router;
}
