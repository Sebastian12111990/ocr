import "reflect-metadata";

import { crearContenedor } from "../contenedor/contenedor.js";
import { TIPOS } from "../contenedor/tipos.js";
import { ServicioImagenes } from "../features/imagenes/imagenes.service.js";
import { fuenteDatos } from "./fuente-datos.js";

async function principal(): Promise<void> {
  await fuenteDatos.initialize();
  const contenedor = crearContenedor(fuenteDatos);
  const servicio = contenedor.get<ServicioImagenes>(TIPOS.ServicioImagenes);

  const imagenes = await servicio.sincronizar();
  console.log(`Sincronizadas ${imagenes.length} imágenes desde services/cv:`);
  for (const imagen of imagenes) {
    console.log(`  - ${imagen.nombreArchivo} -> patente esperada: ${imagen.patenteEsperada}`);
  }

  await fuenteDatos.destroy();
}

principal().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
