import { z } from "zod";

/**
 * Espejo en TS del contrato que valida `services/cv` (ver
 * `services/cv/api/esquemas.py`). Un único array ordenado sirve a los dos
 * modos: en modo fijo las etapas van en su orden canónico y las apagadas se
 * mandan igual con `activa: false` para no perder sus valores; en modo libre
 * el array admite cualquier orden y tipos repetidos.
 */
export const esquemaEtapaPipeline = z.object({
  tipo: z.string().min(1),
  activa: z.boolean().default(true),
  parametros: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])).default({}),
});

export const esquemaPipeline = z.object({
  modo: z.enum(["fijo", "libre"]),
  etapas: z.array(esquemaEtapaPipeline).min(1),
});

export type EtapaPipeline = z.infer<typeof esquemaEtapaPipeline>;
export type Pipeline = z.infer<typeof esquemaPipeline>;
