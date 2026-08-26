import { Container } from "inversify";
import type { DataSource } from "typeorm";

import { TIPOS } from "./tipos.js";
import { ClienteCv } from "../infraestructura/cliente-cv.js";

import { Imagen } from "../features/imagenes/imagen.entidad.js";
import { Preset } from "../features/presets/preset.entidad.js";
import { Ejecucion } from "../features/ejecuciones/ejecucion.entidad.js";

import { ServicioCatalogo } from "../features/catalogo/catalogo.service.js";
import { ControladorCatalogo } from "../features/catalogo/catalogo.controller.js";

import { ServicioImagenes } from "../features/imagenes/imagenes.service.js";
import { ControladorImagenes } from "../features/imagenes/imagenes.controller.js";

import { ServicioProcesamiento } from "../features/procesamiento/procesamiento.service.js";
import { ControladorProcesamiento } from "../features/procesamiento/procesamiento.controller.js";

import { ServicioOcr } from "../features/ocr/ocr.service.js";
import { ControladorOcr } from "../features/ocr/ocr.controller.js";

import { ServicioPresets } from "../features/presets/presets.service.js";
import { ControladorPresets } from "../features/presets/presets.controller.js";

import { ServicioEjecuciones } from "../features/ejecuciones/ejecuciones.service.js";
import { ControladorEjecuciones } from "../features/ejecuciones/ejecuciones.controller.js";

/** Construye el contenedor de Inversify. Requiere que `fuenteDatos` ya esté inicializada. */
export function crearContenedor(fuenteDatos: DataSource): Container {
  const contenedor = new Container();

  contenedor.bind(TIPOS.FuenteDatos).toConstantValue(fuenteDatos);
  contenedor.bind(TIPOS.RepositorioImagen).toConstantValue(fuenteDatos.getRepository(Imagen));
  contenedor.bind(TIPOS.RepositorioPreset).toConstantValue(fuenteDatos.getRepository(Preset));
  contenedor.bind(TIPOS.RepositorioEjecucion).toConstantValue(fuenteDatos.getRepository(Ejecucion));

  contenedor.bind(TIPOS.ClienteCv).to(ClienteCv).inSingletonScope();

  contenedor.bind(TIPOS.ServicioCatalogo).to(ServicioCatalogo).inSingletonScope();
  contenedor.bind(TIPOS.ControladorCatalogo).to(ControladorCatalogo).inSingletonScope();

  contenedor.bind(TIPOS.ServicioImagenes).to(ServicioImagenes).inSingletonScope();
  contenedor.bind(TIPOS.ControladorImagenes).to(ControladorImagenes).inSingletonScope();

  contenedor.bind(TIPOS.ServicioProcesamiento).to(ServicioProcesamiento).inSingletonScope();
  contenedor.bind(TIPOS.ControladorProcesamiento).to(ControladorProcesamiento).inSingletonScope();

  contenedor.bind(TIPOS.ServicioOcr).to(ServicioOcr).inSingletonScope();
  contenedor.bind(TIPOS.ControladorOcr).to(ControladorOcr).inSingletonScope();

  contenedor.bind(TIPOS.ServicioPresets).to(ServicioPresets).inSingletonScope();
  contenedor.bind(TIPOS.ControladorPresets).to(ControladorPresets).inSingletonScope();

  contenedor.bind(TIPOS.ServicioEjecuciones).to(ServicioEjecuciones).inSingletonScope();
  contenedor.bind(TIPOS.ControladorEjecuciones).to(ControladorEjecuciones).inSingletonScope();

  return contenedor;
}
