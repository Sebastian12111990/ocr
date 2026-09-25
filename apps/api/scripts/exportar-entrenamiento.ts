import "reflect-metadata";

import { DeteccionImagen } from "../src/features/dataset/deteccion-imagen.entidad.js";
import { EtiquetaImagen } from "../src/features/dataset/etiqueta-imagen.entidad.js";
import { ImagenDataset } from "../src/features/dataset/imagen-dataset.entidad.js";
import { TipoEtiqueta } from "../src/features/dataset/tipo-etiqueta.entidad.js";
import { ServicioDataset } from "../src/features/dataset/dataset.service.js";
import { ServicioExportadorDataset } from "../src/features/entrenamientos/exportador-dataset.service.js";
import { fuenteDatos } from "../src/infraestructura/fuente-datos.js";

/**
 * Arma el export efímero images/+labels/+data.yaml para entrenar, vía
 * ServicioExportadorDataset (misma lógica que va a usar el job bajo demanda cuando exista).
 * Construido a mano contra los repos, sin pasar por el contenedor Inversify, como el resto de
 * los scripts de este directorio.
 *
 * Uso: npm run exportar:entrenamiento -- [--clases patente] [--fraccion-val 0.2] [--semilla 0]
 *      [--previsualizar]
 */
function leerArgumento(nombre: string): string | undefined {
  const indice = process.argv.indexOf(nombre);
  return indice >= 0 ? process.argv[indice + 1] : undefined;
}

async function principal(): Promise<void> {
  const clases = (leerArgumento("--clases") ?? "patente").split(",").map((c) => c.trim());
  const fraccionValArg = leerArgumento("--fraccion-val");
  const semillaArg = leerArgumento("--semilla");
  const soloPrevisualizar = process.argv.includes("--previsualizar");

  await fuenteDatos.initialize();
  const servicioDataset = new ServicioDataset(
    fuenteDatos.getRepository(ImagenDataset),
    fuenteDatos.getRepository(TipoEtiqueta),
    fuenteDatos.getRepository(EtiquetaImagen),
    fuenteDatos.getRepository(DeteccionImagen),
  );
  const servicioExportador = new ServicioExportadorDataset(servicioDataset);

  const opciones = {
    clases,
    fraccionVal: fraccionValArg ? Number(fraccionValArg) : undefined,
    semilla: semillaArg ? Number(semillaArg) : undefined,
  };

  if (soloPrevisualizar) {
    const resumen = await servicioExportador.previsualizar(opciones);
    console.log(JSON.stringify(resumen, null, 2));
    if (resumen.advertencia) console.warn(`\nAVISO: ${resumen.advertencia}`);
  } else {
    const resultado = await servicioExportador.exportar(opciones);
    console.log(JSON.stringify(resultado, null, 2));
    if (resultado.advertencia) console.warn(`\nAVISO: ${resultado.advertencia}`);
    console.log(`\nExportado en: ${resultado.directorio}`);
  }

  await fuenteDatos.destroy();
}

principal().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
