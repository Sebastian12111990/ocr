import type { MetricasFinalesYolo, TipoEntrenamientoYolo } from "./entrenamiento-yolo.entidad.js";

export interface ResumenEntrenamiento {
  id: string;
  nombre: string;
  tipo: TipoEntrenamientoYolo;
  modeloBase: string;
  totalImagenes: number;
  imagenesConDeteccion: number | null;
  metricasFinales: MetricasFinalesYolo | null;
  duracionMs: number;
  creadoEn: Date;
}

export interface DetalleEntrenamiento extends ResumenEntrenamiento {
  parametros: Record<string, unknown>;
  rutaPesos: string | null;
}

export interface MetricaEpocaRespuesta {
  epoca: number;
  boxLoss: number;
  clsLoss: number;
  dflLoss: number;
  map50: number | null;
  map5095: number | null;
  precision: number | null;
  recall: number | null;
}
