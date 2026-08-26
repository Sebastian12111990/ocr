export interface Imagen {
  id: string;
  nombreArchivo: string;
  rutaRelativa: string;
  ancho: number;
  alto: number;
  patenteEsperada: string | null;
  creadoEn: string;
}
