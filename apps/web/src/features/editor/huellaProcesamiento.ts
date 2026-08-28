import type { Pipeline } from "./pipeline.types";

let secuenciaContextos = 0;

function ordenarClaves(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenarClaves);
  if (valor === null || typeof valor !== "object") return valor;

  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>)
      .sort(([claveA], [claveB]) => claveA.localeCompare(claveB))
      .map(([clave, contenido]) => [clave, ordenarClaves(contenido)]),
  );
}

/** Identifica exactamente la combinación de imagen, modo, orden y parámetros. */
export function crearHuellaProcesamiento(imagenId: string | null, pipeline: Pipeline): string | null {
  if (!imagenId) return null;
  return JSON.stringify(ordenarClaves({ pipelineVersion: 1, imagenId, pipeline }));
}

/** Distingue dos visitas al mismo pipeline en una secuencia A → B → A. */
export function crearContextoVigente(huella: string | null): string | null {
  if (!huella) return null;
  secuenciaContextos += 1;
  return `${secuenciaContextos}:${huella}`;
}
