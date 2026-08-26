import cors from "cors";
import express, { type Express } from "express";
import type { Container } from "inversify";
import type { DataSource } from "typeorm";

import { TIPOS } from "./contenedor/tipos.js";
import { crearRutasCandidatos } from "./features/candidatos/candidatos.routes.js";
import { crearRutasCatalogo } from "./features/catalogo/catalogo.routes.js";
import { crearRutasEjecuciones } from "./features/ejecuciones/ejecuciones.routes.js";
import { crearRutasImagenes } from "./features/imagenes/imagenes.routes.js";
import { crearRutasOcr } from "./features/ocr/ocr.routes.js";
import { crearRutasPresets } from "./features/presets/presets.routes.js";
import { crearRutasProcesamiento } from "./features/procesamiento/procesamiento.routes.js";
import { ClienteCv } from "./infraestructura/cliente-cv.js";
import { middlewareError } from "./shared/http/middleware-error.js";

export function crearApp(contenedor: Container, fuenteDatos: DataSource): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/salud", async (_req, res) => {
    const bd = fuenteDatos.isInitialized;
    let servicioCv = false;
    try {
      await contenedor.get<ClienteCv>(TIPOS.ClienteCv).obtenerCatalogo();
      servicioCv = true;
    } catch {
      servicioCv = false;
    }

    const ok = bd && servicioCv;
    res.status(ok ? 200 : 503).json({ estado: ok ? "ok" : "degradado", bd, servicioCv });
  });

  app.use("/api/catalogo", crearRutasCatalogo(contenedor));
  app.use("/api/imagenes", crearRutasImagenes(contenedor));
  app.use("/api/procesar", crearRutasProcesamiento(contenedor));
  app.use("/api/ocr", crearRutasOcr(contenedor));
  app.use("/api/presets", crearRutasPresets(contenedor));
  app.use("/api/ejecuciones", crearRutasEjecuciones(contenedor));
  app.use("/api/candidatos", crearRutasCandidatos(contenedor));

  app.use(middlewareError);

  return app;
}
