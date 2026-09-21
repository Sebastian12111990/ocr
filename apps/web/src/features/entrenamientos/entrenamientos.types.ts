export type TipoEntrenamientoYolo = "sondeo" | "auto_etiquetado" | "entrenamiento";

export interface MetricasFinalesYolo {
  map50?: number;
  map50_95?: number;
  precision?: number;
  recall?: number;
}

export interface ResumenEntrenamiento {
  id: string;
  nombre: string;
  tipo: TipoEntrenamientoYolo;
  modeloBase: string;
  totalImagenes: number;
  imagenesConDeteccion: number | null;
  metricasFinales: MetricasFinalesYolo | null;
  duracionMs: number;
  creadoEn: string;
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
