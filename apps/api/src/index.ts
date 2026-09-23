import "reflect-metadata";

import { crearApp } from "./app.js";
import { entorno } from "./config/env.js";
import { crearContenedor } from "./contenedor/contenedor.js";
import { TIPOS } from "./contenedor/tipos.js";
import { crearServidorProcesos } from "./features/dataset/procesos.websocket.js";
import type { ServicioProcesamientoDataset } from "./features/dataset/procesamiento-dataset.service.js";
import { fuenteDatos } from "./infraestructura/fuente-datos.js";

async function principal(): Promise<void> {
  await fuenteDatos.initialize();
  const contenedor = crearContenedor(fuenteDatos);
  const app = crearApp(contenedor, fuenteDatos);

  const servidorHttp = app.listen(entorno.PUERTO, () => {
    console.log(`API escuchando en http://localhost:${entorno.PUERTO}`);
  });

  // Sin este handler, un error de bind (ej. EADDRINUSE cuando tsx watch reinicia antes de que
  // el proceso anterior suelte el puerto) queda sin capturar y tira abajo todo el proceso.
  servidorHttp.on("error", (error) => {
    console.error("Error en el servidor HTTP:", error);
  });

  crearServidorProcesos(servidorHttp, contenedor.get<ServicioProcesamientoDataset>(TIPOS.ServicioProcesamientoDataset));
}

principal().catch((error: unknown) => {
  console.error("Error al iniciar la API:", error);
  process.exit(1);
});
