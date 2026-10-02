export type VistaDataset =
  | "todas"
  | "vehiculo_con_patente"
  | "solo_patente"
  | "vehiculo_sin_patente"
  | "sin_deteccion"
  | "pendiente"
  | "aceptada"
  | "descartada";

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
  imagenesListasParaEntrenar: number;
  /** Cajas de patente (del modelo más reciente por imagen, sin duplicados) con veredicto puesto
   * vs. pendientes — el umbral de "aceptar por confianza" no saca nada de acá, solo decide qué
   * se acepta en bloque automáticamente. */
  cajasPatente: { total: number; conVeredicto: number; pendientes: number };
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
  /** Ni aceptadas ni descartadas — mismo criterio que la pestaña "Pendiente". */
  pendientes: number;
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

export interface FiltrosAceptarPorConfianza {
  clase: string;
  confianzaMin: number;
  confianzaMax?: number;
  planta?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface PrevisualizacionAceptarPorConfianza {
  candidatos: number;
  revisadasEnRango: number;
  correctasEnRango: number;
  tasaAciertoEstimada: number | null;
}

export interface ResultadoAceptarPorConfianza {
  actualizadas: number;
}

/** "Aceptar todas": acepta en bloque las cajas de patente pendientes de la vista/filtro actual
 * (equivalente a hacer click en cada caja y marcarla correcta), sin condición de confianza — pero
 * excluye las imágenes marcadas `descartada`. */
export interface FiltrosAceptarTodas {
  vista?: VistaDataset;
  planta?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  etiqueta?: string;
}

export interface PrevisualizacionAceptarTodas {
  candidatos: number;
}

export interface ResultadoAceptarTodas {
  actualizadas: number;
}

/** "Descartar todas": marca "Descartada" todas las imágenes de la vista "pendiente" con los
 * mismos filtros que la galería. */
export interface FiltrosDescartarPendientes {
  planta?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  etiqueta?: string;
  confianzaMin?: number;
  confianzaMax?: number;
  confianzaClase?: string;
}

export interface PrevisualizacionDescartarPendientes {
  candidatos: number;
}

export interface ResultadoDescartarPendientes {
  descartadas: number;
}

/** "Descartar por forma": marca 'falso_positivo' en bloque las cajas pendientes cuya relación
 * ancho/alto no es físicamente posible para una patente vista de frente (siempre más ancha que
 * alta) — un filtro barato antes de mirar imagen por imagen. `confianzaMax` es la salvaguarda
 * verificada en la práctica: una caja con forma rara pero confianza ALTA suele ser una patente
 * real con la caja mal regresionada (p.ej. buses donde se mete en el paragolpe), no un falso
 * positivo — exigir además confianza baja evita repetir ese error. */
export interface FiltrosDescartarPorForma {
  clase: string;
  relacionMin: number;
  relacionMax: number;
  confianzaMax?: number;
  planta?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface PrevisualizacionDescartarPorForma {
  candidatos: number;
}

export interface ResultadoDescartarPorForma {
  actualizadas: number;
}

/** "Descartar por tamaño relativo": marca 'falso_positivo' en bloque las cajas de patente
 * pendientes cuya área es mucho menor a la mayor caja de patente de su MISMA imagen — cuando el
 * modelo detecta dos patentes en la misma foto, la chica suele ser ruido (reflejo, franja de otro
 * vehículo) y la grande la real. No toca imágenes con una sola detección de patente: una caja
 * chica y sola puede ser legítima, solo es sospechosa cuando compite con una mucho más grande. */
export interface FiltrosDescartarPorTamanoRelativo {
  clase: string;
  relacionMaxima: number;
  /** Umbral adicional (AND con `relacionMaxima`, no reemplaza el criterio relativo): la caja solo
   * es candidata si además su tamaño en píxeles reales de la imagen no supera este máximo. */
  anchoMaximoPx?: number;
  altoMaximoPx?: number;
  planta?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface PrevisualizacionDescartarPorTamanoRelativo {
  candidatos: number;
}

export interface ResultadoDescartarPorTamanoRelativo {
  actualizadas: number;
}

export interface FiltrosEstadisticasTamanoPatente {
  clase: string;
  planta?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

/** Ancho/alto en píxeles reales de las cajas ya confirmadas 'correcta' — referencia para calibrar
 * "Ancho máx. (px)" / "Alto máx. (px)" de "Descartar por tamaño relativo" con datos reales. */
export interface EstadisticasTamanoPatente {
  muestras: number;
  ancho: { promedio: number; min: number; max: number } | null;
  alto: { promedio: number; min: number; max: number } | null;
}

/** Ancho/alto uniforme para los controles del filtro (Planta, Fechas, Etiqueta, Modelo, Procesar). */
export const ANCHO_CAMPO_FILTRO = 180;
export const ALTO_CAMPO_FILTRO = 40;

export const ETIQUETAS_VISTA: Record<VistaDataset, string> = {
  todas: "Todas",
  vehiculo_con_patente: "Vehículo con patente",
  solo_patente: "Solo patente",
  vehiculo_sin_patente: "Vehículo, sin patente",
  sin_deteccion: "Sin detección",
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  descartada: "Descartada",
};

/** Claves de tipo_etiqueta que gatean el dataset de entrenamiento — ver docs/decisiones-modelo-dataset.md. */
export const CLAVE_REVISADA = "revisada";
export const CLAVE_DESCARTADA = "descartada";

/** Única clase relevante para el filtro/aceptación por confianza (ver PanelAceptarPorConfianza). */
export const CLASE_PATENTE = "patente";

/** Las cajas de vehículo (car/truck/bus/motorcycle) no se dibujan ni se numeran en la galería:
 * mostrar la patente es lo único que importa para revisar — el auto ya se ve en la foto, el
 * rectángulo alrededor no aporta nada y solo genera ruido visual. Usado por CajasSobreImagen (qué
 * dibuja) y useAtajosGaleria (a qué caja mapean las teclas 1-9), para que ambos coincidan. */
export function cajasPatente(cajas: CajaDeteccion[]): CajaDeteccion[] {
  return cajas.filter((caja) => caja.clase === CLASE_PATENTE);
}
