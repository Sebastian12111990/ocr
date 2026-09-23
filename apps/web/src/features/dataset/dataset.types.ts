export type VistaDataset =
  | "todas"
  | "con_patente"
  | "vehiculo_sin_patente"
  | "sin_vehiculo_con_patente"
  | "sin_deteccion";

export type VeredictoDeteccion = "correcta" | "falso_positivo";
export type FamiliaTipoEtiqueta = "deteccion" | "calidad" | "revision";
export type OrigenEtiqueta = "manual" | "modelo" | "migracion";

export interface CajaDeteccion {
  id: string;
  modelo: string;
  clase: string;
  confianza: number;
  xc: number;
  yc: number;
  ancho: number;
  alto: number;
  veredicto: VeredictoDeteccion | null;
}

export interface EtiquetaAsignada {
  clave: string;
  origen: OrigenEtiqueta;
  nota: string | null;
}

export interface ImagenDatasetResumida {
  id: string;
  rutaRelativa: string;
  planta: string | null;
  fecha: string | null;
  ancho: number;
  alto: number;
  cajas: CajaDeteccion[];
  etiquetas: EtiquetaAsignada[];
}

export interface PaginaImagenesDataset {
  imagenes: ImagenDatasetResumida[];
  total: number;
  siguienteCursor: string | null;
}

export interface TipoEtiquetaResumen {
  clave: string;
  nombre: string;
  familia: FamiliaTipoEtiqueta;
  orden: number;
}

export interface ResumenDataset {
  totalImagenes: number;
  porPlanta: { planta: string | null; total: number }[];
  porVista: Record<VistaDataset, number>;
  porEtiqueta: { clave: string; total: number }[];
  modelos: string[];
  actualizadoEn: string;
}

export interface FiltrosResumenDataset {
  planta?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export type EstadoProceso = "inactivo" | "corriendo" | "cargando" | "listo" | "error";

export interface EstadoProcesamiento {
  estado: EstadoProceso;
  planta: string | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
  modelo: string | null;
  procesadas: number;
  total: number;
  detecciones: number | null;
  mensaje: string | null;
  entrenamientoId: string | null;
}

export interface FechaDataset {
  fecha: string;
  total: number;
  procesadas: number;
}

export interface ModeloDeteccion {
  archivo: string;
  etiqueta: string;
}

export interface DatosIniciarProcesamiento {
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  modelo?: string;
}

/** Ancho/alto uniforme para los controles del filtro (Planta, Fechas, Etiqueta, Modelo, Procesar). */
export const ANCHO_CAMPO_FILTRO = 180;
export const ALTO_CAMPO_FILTRO = 40;

export const ETIQUETAS_VISTA: Record<VistaDataset, string> = {
  todas: "Todas",
  con_patente: "Con patente",
  vehiculo_sin_patente: "Vehículo, sin patente",
  sin_vehiculo_con_patente: "Sin vehículo, con patente",
  sin_deteccion: "Sin detección",
};
