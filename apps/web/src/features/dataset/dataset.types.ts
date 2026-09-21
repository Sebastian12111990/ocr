export type OrigenImagenDataset = "dataset" | "sin_vehiculo" | "sin_deteccion";

export interface ResumenDataset {
  dataset: number;
  sinVehiculo: number;
  sinDeteccion: number;
  totalImagenes: number;
  labelsConContenido: number;
  labelsVacios: number;
  actualizadoEn: string;
}

export interface CajaNormalizada {
  xc: number;
  yc: number;
  ancho: number;
  alto: number;
}

export interface ImagenDataset {
  nombre: string;
  origen: OrigenImagenDataset;
  cajas: CajaNormalizada[];
}

export interface MuestraDataset {
  imagenes: ImagenDataset[];
  total: number;
}

export interface ImagenClasificada extends ImagenDataset {
  clasificacionId: string;
}

export interface MuestraClasificada {
  imagenes: ImagenClasificada[];
  total: number;
}

export type PerspectivaClasificacion = "patente_sin_vehiculo" | "descartada_sin_vehiculo" | "caso_dificil";
export type MotivoCasoDificil = "brillo" | "suciedad" | "otro";

export interface ClasificacionImagen {
  id: string;
  nombreArchivo: string;
  origen: OrigenImagenDataset;
  perspectiva: PerspectivaClasificacion;
  motivo: MotivoCasoDificil | null;
  creadoEn: string;
}
