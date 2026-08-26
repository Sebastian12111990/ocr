import "reflect-metadata";

import { crearApp } from "./app.js";
import { entorno } from "./config/env.js";
import { crearContenedor } from "./contenedor/contenedor.js";
import { fuenteDatos } from "./infraestructura/fuente-datos.js";

async function principal(): Promise<void> {
  await fuenteDatos.initialize();
  const contenedor = crearContenedor(fuenteDatos);
  const app = crearApp(contenedor, fuenteDatos);

  app.listen(entorno.PUERTO, () => {
    console.log(`API escuchando en http://localhost:${entorno.PUERTO}`);
  });
}

principal().catch((error: unknown) => {
  console.error("Error al iniciar la API:", error);
  process.exit(1);
});
