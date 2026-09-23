import { DataSource } from "typeorm";

import { entorno } from "../config/env.js";
import { Ejecucion } from "../features/ejecuciones/ejecucion.entidad.js";
import { CandidatoEjecucion } from "../features/ejecuciones/candidato-ejecucion.entidad.js";
import { Imagen } from "../features/imagenes/imagen.entidad.js";
import { Preset } from "../features/presets/preset.entidad.js";
import { EntrenamientoYolo } from "../features/entrenamientos/entrenamiento-yolo.entidad.js";
import { MetricaEpoca } from "../features/entrenamientos/metrica-epoca.entidad.js";
import { ImagenDataset } from "../features/dataset/imagen-dataset.entidad.js";
import { TipoEtiqueta } from "../features/dataset/tipo-etiqueta.entidad.js";
import { EtiquetaImagen } from "../features/dataset/etiqueta-imagen.entidad.js";
import { DeteccionImagen } from "../features/dataset/deteccion-imagen.entidad.js";

export const fuenteDatos = new DataSource({
  type: "postgres",
  host: entorno.POSTGRES_HOST,
  port: entorno.POSTGRES_PORT,
  username: entorno.POSTGRES_USER,
  password: entorno.POSTGRES_PASSWORD,
  database: entorno.POSTGRES_DB,
  entities: [
    Imagen,
    Preset,
    Ejecucion,
    CandidatoEjecucion,
    EntrenamientoYolo,
    MetricaEpoca,
    ImagenDataset,
    TipoEtiqueta,
    EtiquetaImagen,
    DeteccionImagen,
  ],
  migrations: ["src/migraciones/*.ts"],
  synchronize: false,
});
