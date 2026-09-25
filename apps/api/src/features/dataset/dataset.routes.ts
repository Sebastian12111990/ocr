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
  router.get("/detecciones/aceptar-por-confianza/previsualizar", controlador.previsualizarAceptarPorConfianza);
  router.post("/detecciones/aceptar-por-confianza", controlador.aceptarPorConfianza);
  router.get("/detecciones/aceptar-todas/previsualizar", controlador.previsualizarAceptarTodas);
  router.post("/detecciones/aceptar-todas", controlador.aceptarTodas);
  router.get("/detecciones/descartar-por-forma/previsualizar", controlador.previsualizarDescartarPorForma);
  router.get("/detecciones/descartar-por-forma/imagenes", controlador.listarImagenesDescartarPorForma);
  router.post("/detecciones/descartar-por-forma", controlador.descartarPorForma);
  router.get(
    "/detecciones/descartar-por-tamano-relativo/previsualizar",
    controlador.previsualizarDescartarPorTamanoRelativo,
  );
  router.get(
    "/detecciones/descartar-por-tamano-relativo/imagenes",
    controlador.listarImagenesDescartarPorTamanoRelativo,
  );
  router.post("/detecciones/descartar-por-tamano-relativo", controlador.descartarPorTamanoRelativo);
  router.get("/detecciones/estadisticas-tamano", controlador.obtenerEstadisticasTamano);
  router.get(
    "/detecciones/descartar-por-tamano-relativo/no-incluidas/previsualizar",
    controlador.previsualizarNoIncluidasPorTamanoRelativo,
  );
  router.get(
    "/detecciones/descartar-por-tamano-relativo/no-incluidas",
    controlador.listarImagenesNoIncluidasPorTamanoRelativo,
  );
  router.patch("/detecciones/:id", controlador.fijarVeredicto);

  return router;
}
