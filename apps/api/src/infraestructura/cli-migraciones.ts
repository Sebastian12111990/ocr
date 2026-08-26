import "reflect-metadata";

import { fuenteDatos } from "./fuente-datos.js";

const comando = process.argv[2];

async function principal(): Promise<void> {
  await fuenteDatos.initialize();

  if (comando === "run") {
    const ejecutadas = await fuenteDatos.runMigrations();
    console.log(`Migraciones aplicadas: ${ejecutadas.map((m) => m.name).join(", ") || "ninguna pendiente"}`);
  } else if (comando === "revert") {
    await fuenteDatos.undoLastMigration();
    console.log("Última migración revertida");
  } else {
    console.error("Uso: tsx cli-migraciones.ts <run|revert>");
    process.exitCode = 1;
  }

  await fuenteDatos.destroy();
}

principal().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
