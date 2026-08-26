/**
 * Espejo del contrato que expone `services/cv` y valida `apps/api`
 * (`services/cv/api/esquemas.py`, `apps/api/src/shared/contrato/pipeline.ts`).
 * Un único array ordenado sirve a los dos modos: en modo fijo las etapas van
 * en su orden canónico y las apagadas se mandan igual con `activa: false`
 * para no perder sus valores; en modo libre el array admite cualquier orden
 * y tipos repetidos.
 */
export type ValorParametro = number | boolean | string;

export interface EtapaPipeline {
  tipo: string;
  activa: boolean;
  parametros: Record<string, ValorParametro>;
}

export type ModoPipeline = "fijo" | "libre";

export interface Pipeline {
  modo: ModoPipeline;
  etapas: EtapaPipeline[];
}
