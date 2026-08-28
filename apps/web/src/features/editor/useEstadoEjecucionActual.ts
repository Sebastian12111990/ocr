import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Candidato } from "@/features/candidatos/candidatos.types";
import type { ResultadoOcrManual } from "@/features/resultados/resultados.types";
import { crearContextoVigente, crearHuellaProcesamiento } from "./huellaProcesamiento";
import type { Pipeline } from "./pipeline.types";

interface ResultadoVigente<T> {
  contexto: string;
  valor: T;
  origen: "manual" | "historico";
  restauracionId?: string;
}

export interface RestauracionResultados {
  id: string;
  huella: string;
  resultadoOcr: ResultadoOcrManual;
  candidatos: Candidato[];
}

/**
 * Conserva resultados solo mientras pertenecen a la imagen y al pipeline
 * actuales. Las respuestas tardías de solicitudes anteriores se descartan.
 */
export function useEstadoEjecucionActual(
  imagenId: string | null,
  pipeline: Pipeline,
  restauracion: RestauracionResultados | null = null,
) {
  const huellaActual = crearHuellaProcesamiento(imagenId, pipeline);
  const contextoActual = useMemo(() => crearContextoVigente(huellaActual), [huellaActual]);
  const contextoActualRef = useRef(contextoActual);
  contextoActualRef.current = contextoActual;

  const [ocrGuardado, setOcrGuardado] = useState<ResultadoVigente<ResultadoOcrManual> | null>(null);
  const [candidatosGuardados, setCandidatosGuardados] = useState<ResultadoVigente<Candidato[]> | null>(null);

  useEffect(() => {
    if (restauracion?.huella === huellaActual && contextoActual) {
      setOcrGuardado({
        contexto: contextoActual,
        valor: restauracion.resultadoOcr,
        origen: "historico",
        restauracionId: restauracion.id,
      });
      setCandidatosGuardados({
        contexto: contextoActual,
        valor: restauracion.candidatos,
        origen: "historico",
        restauracionId: restauracion.id,
      });
      return;
    }

    setOcrGuardado((actual) => (
      actual?.contexto === contextoActual && actual.origen === "manual" ? actual : null
    ));
    setCandidatosGuardados((actual) => (
      actual?.contexto === contextoActual && actual.origen === "manual" ? actual : null
    ));
  }, [contextoActual, huellaActual, restauracion]);

  const registrarOcr = useCallback((contextoSolicitud: string, resultado: ResultadoOcrManual): void => {
    if (contextoSolicitud !== contextoActualRef.current) return;
    setOcrGuardado({ contexto: contextoSolicitud, valor: resultado, origen: "manual" });
  }, []);

  const registrarCandidatos = useCallback((contextoSolicitud: string, candidatos: Candidato[]): void => {
    if (contextoSolicitud !== contextoActualRef.current) return;
    setCandidatosGuardados({ contexto: contextoSolicitud, valor: candidatos, origen: "manual" });
  }, []);

  const invalidarOcr = useCallback((): void => setOcrGuardado(null), []);
  const invalidarCandidatos = useCallback((): void => setCandidatosGuardados(null), []);

  const vaciarResultados = useCallback((): void => {
    setOcrGuardado(null);
    setCandidatosGuardados(null);
  }, []);

  const resultadoOcr = ocrGuardado?.contexto === contextoActual
    && (ocrGuardado.origen === "manual" || ocrGuardado.restauracionId === restauracion?.id)
    ? ocrGuardado.valor
    : null;
  const candidatos = candidatosGuardados?.contexto === contextoActual
    && (candidatosGuardados.origen === "manual" || candidatosGuardados.restauracionId === restauracion?.id)
    ? candidatosGuardados.valor
    : null;

  return {
    huellaActual,
    contextoActual,
    resultadoOcr,
    candidatos,
    ocrValido: resultadoOcr !== null,
    candidatosValidos: candidatos !== null,
    registrarOcr,
    registrarCandidatos,
    invalidarOcr,
    invalidarCandidatos,
    vaciarResultados,
  };
}
