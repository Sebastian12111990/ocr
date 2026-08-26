export interface CajaCandidato {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  angulo: number;
}

export interface Candidato {
  caja: CajaCandidato;
  area: number;
  texto: string | null;
  confianza: number | null;
  imagenPngBase64: string | null;
}
