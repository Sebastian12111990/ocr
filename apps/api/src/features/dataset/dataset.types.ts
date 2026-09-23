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

export interface FiltrosListarImagenes {
  vista: VistaDataset;
  planta?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  etiqueta?: string;
  sinEtiqueta?: string;
  cursor?: string;
  limite: number;
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
  etiqueta?: string;
  sinEtiqueta?: string;
}

export interface FilaDeteccionCsv {
  rutaRelativa: string;
  clase: string;
  confianza: number;
  xc: number;
  yc: number;
  ancho: number;
  alto: number;
}

export interface ResultadoCargaDetecciones {
  cargadas: number;
  sinImagen: number;
}

export type EstadoProceso = "inactivo" | "corriendo" | "cargando" | "listo" | "error";

/** Estado del único job de procesamiento en curso — herramienta de un solo usuario, un job a la vez. */
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

export interface DatosIniciarProcesamiento {
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  modelo?: string;
}

export interface ModeloDeteccion {
  archivo: string;
  etiqueta: string;
}
