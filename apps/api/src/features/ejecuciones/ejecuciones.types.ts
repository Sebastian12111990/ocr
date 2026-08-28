import type { Pipeline } from "../../shared/contrato/pipeline.js";

export interface ResultadoOcrParaGuardar {
  textoDetectado: string | null;
  confianza: number | null;
  duracionMs: number;
}

export interface CandidatoParaGuardar {
  caja: {
    x: number;
    y: number;
    ancho: number;
    alto: number;
    angulo: number;
  };
  area: number;
  texto: string | null;
  confianza: number | null;
  coincidencia: number | null;
  imagenPngBase64: string | null;
}

export interface SolicitudGuardarEjecucion {
  imagenId: string;
  pipeline: Pipeline;
  resultadoOcr: ResultadoOcrParaGuardar;
  imagenProcesadaPngBase64: string;
  candidatos: CandidatoParaGuardar[];
}

export interface ResultadoGuardarEjecucion {
  id: string;
  creadoEn: Date;
  mejorCoincidencia: number;
  candidatosGuardados: number;
}

export interface ResumenEjecucion {
  id: string;
  imagen: {
    id: string;
    nombreArchivo: string;
  };
  patenteEsperada: string;
  modo: Pipeline["modo"];
  pipelineVersion: number;
  creadoEn: Date;
  mejorCoincidencia: number;
  candidatosGuardados: number;
}

export interface DetalleEjecucion {
  id: string;
  creadoEn: Date;
  imagen: {
    id: string;
    nombreArchivo: string;
    ancho: number;
    alto: number;
  };
  patenteEsperada: string;
  pipelineVersion: number;
  pipeline: Pipeline;
  resultadoOcr: {
    textoDetectado: string | null;
    confianza: number | null;
    acierto: boolean;
    distanciaEdicion: number | null;
    duracionMs: number;
  };
  mejorCoincidencia: number;
  imagenProcesadaPngBase64: string;
  candidatos: Array<{
    id: string;
    orden: number;
    caja: {
      x: number;
      y: number;
      ancho: number;
      alto: number;
      angulo: number;
    };
    area: number;
    texto: string;
    confianza: number | null;
    coincidencia: number;
    imagenPngBase64: string;
  }>;
}
