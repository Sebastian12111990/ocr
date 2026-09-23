import { Container } from "inversify";
import type { DataSource } from "typeorm";

import { TIPOS } from "./tipos.js";
import { ClienteCv } from "../infraestructura/cliente-cv.js";

import { Imagen } from "../features/imagenes/imagen.entidad.js";
import { Preset } from "../features/presets/preset.entidad.js";
import { Ejecucion } from "../features/ejecuciones/ejecucion.entidad.js";
import { EntrenamientoYolo } from "../features/entrenamientos/entrenamiento-yolo.entidad.js";
import { ImagenDataset } from "../features/dataset/imagen-dataset.entidad.js";
import { TipoEtiqueta } from "../features/dataset/tipo-etiqueta.entidad.js";
import { EtiquetaImagen } from "../features/dataset/etiqueta-imagen.entidad.js";
import { DeteccionImagen } from "../features/dataset/deteccion-imagen.entidad.js";

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

import { ServicioCandidatos } from "../features/candidatos/candidatos.service.js";
import { ControladorCandidatos } from "../features/candidatos/candidatos.controller.js";

import { ServicioEntrenamientos } from "../features/entrenamientos/entrenamientos.service.js";
import { ControladorEntrenamientos } from "../features/entrenamientos/entrenamientos.controller.js";

import { ServicioDataset } from "../features/dataset/dataset.service.js";
import { ServicioProcesamientoDataset } from "../features/dataset/procesamiento-dataset.service.js";
import { ControladorDataset } from "../features/dataset/dataset.controller.js";

/** Construye el contenedor de Inversify. Requiere que `fuenteDatos` ya esté inicializada. */
export function crearContenedor(fuenteDatos: DataSource): Container {
  const contenedor = new Container();

  contenedor.bind(TIPOS.FuenteDatos).toConstantValue(fuenteDatos);
  contenedor.bind(TIPOS.RepositorioImagen).toConstantValue(fuenteDatos.getRepository(Imagen));
  contenedor.bind(TIPOS.RepositorioPreset).toConstantValue(fuenteDatos.getRepository(Preset));
  contenedor.bind(TIPOS.RepositorioEjecucion).toConstantValue(fuenteDatos.getRepository(Ejecucion));
  contenedor
    .bind(TIPOS.RepositorioEntrenamientoYolo)
    .toConstantValue(fuenteDatos.getRepository(EntrenamientoYolo));
  contenedor.bind(TIPOS.RepositorioImagenDataset).toConstantValue(fuenteDatos.getRepository(ImagenDataset));
  contenedor.bind(TIPOS.RepositorioTipoEtiqueta).toConstantValue(fuenteDatos.getRepository(TipoEtiqueta));
  contenedor.bind(TIPOS.RepositorioEtiquetaImagen).toConstantValue(fuenteDatos.getRepository(EtiquetaImagen));
  contenedor.bind(TIPOS.RepositorioDeteccionImagen).toConstantValue(fuenteDatos.getRepository(DeteccionImagen));

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

  contenedor.bind(TIPOS.ServicioCandidatos).to(ServicioCandidatos).inSingletonScope();
  contenedor.bind(TIPOS.ControladorCandidatos).to(ControladorCandidatos).inSingletonScope();

  contenedor.bind(TIPOS.ServicioEntrenamientos).to(ServicioEntrenamientos).inSingletonScope();
  contenedor.bind(TIPOS.ControladorEntrenamientos).to(ControladorEntrenamientos).inSingletonScope();

  contenedor.bind(TIPOS.ServicioDataset).to(ServicioDataset).inSingletonScope();
  contenedor.bind(TIPOS.ServicioProcesamientoDataset).to(ServicioProcesamientoDataset).inSingletonScope();
  contenedor.bind(TIPOS.ControladorDataset).to(ControladorDataset).inSingletonScope();

  return contenedor;
}
