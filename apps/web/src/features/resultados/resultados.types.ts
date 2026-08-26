import type { EtapaPipeline, ModoPipeline } from "@/features/editor/pipeline.types";
import type { Imagen } from "@/features/imagenes/imagenes.types";

export interface Preset {
  id: string;
  nombre: string;
  modo: ModoPipeline;
  etapas: EtapaPipeline[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface Ejecucion {
  id: string;
  imagen: Imagen;
  preset: Preset | null;
  modo: ModoPipeline;
  etapas: EtapaPipeline[];
  textoDetectado: string | null;
  confianza: number | null;
  acierto: boolean;
  distanciaEdicion: number | null;
  duracionMs: number;
  creadoEn: string;
}
