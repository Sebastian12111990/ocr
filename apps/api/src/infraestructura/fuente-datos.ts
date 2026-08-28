import { DataSource } from "typeorm";

import { entorno } from "../config/env.js";
import { Ejecucion } from "../features/ejecuciones/ejecucion.entidad.js";
import { CandidatoEjecucion } from "../features/ejecuciones/candidato-ejecucion.entidad.js";
import { Imagen } from "../features/imagenes/imagen.entidad.js";
import { Preset } from "../features/presets/preset.entidad.js";

export const fuenteDatos = new DataSource({
  type: "postgres",
  host: entorno.POSTGRES_HOST,
  port: entorno.POSTGRES_PORT,
  username: entorno.POSTGRES_USER,
  password: entorno.POSTGRES_PASSWORD,
  database: entorno.POSTGRES_DB,
  entities: [Imagen, Preset, Ejecucion, CandidatoEjecucion],
  migrations: ["src/migraciones/*.ts"],
  synchronize: false,
});
