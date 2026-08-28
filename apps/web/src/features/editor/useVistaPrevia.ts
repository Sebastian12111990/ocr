import { useEffect, useMemo, useRef, useState } from "react";

import { extraerMensajeError } from "@/shared/utils/errores";
import { useProcesarMutation } from "./editorApi";
import { crearContextoVigente, crearHuellaProcesamiento } from "./huellaProcesamiento";
import type { Pipeline } from "./pipeline.types";

const DEMORA_DEBOUNCE_MS = 250;

export interface VistaHistorica {
  id: string;
  huella: string;
  blob: Blob;
}

/**
 * Refresca el preview automáticamente ~250ms después del último cambio del
 * pipeline, cancelando la petición anterior si todavía estaba en curso.
 */
export function useVistaPrevia(
  imagenId: string | null,
  pipeline: Pipeline,
  vistaHistorica: VistaHistorica | null = null,
) {
  const [procesar] = useProcesarMutation();
  const [vista, setVista] = useState<{
    contexto: string;
    url: string;
    blob: Blob;
    historicoId: string | null;
  } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solicitudEnCursoRef = useRef<{ abort: () => void } | null>(null);
  const urlAnteriorRef = useRef<string | null>(null);
  const huellaActual = crearHuellaProcesamiento(imagenId, pipeline);
  const contextoActual = useMemo(() => crearContextoVigente(huellaActual), [huellaActual]);
  const contextoActualRef = useRef(contextoActual);
  contextoActualRef.current = contextoActual;

  const vistaPerteneceAlOrigen = vistaHistorica
    ? vista?.historicoId === vistaHistorica.id
    : vista?.historicoId === null;
  const urlImagen = vista?.contexto === contextoActual && vistaPerteneceAlOrigen ? vista.url : null;
  const blobImagen = vista?.contexto === contextoActual && vistaPerteneceAlOrigen ? vista.blob : null;

  useEffect(() => {
    solicitudEnCursoRef.current?.abort();
    solicitudEnCursoRef.current = null;
    if (urlAnteriorRef.current) {
      URL.revokeObjectURL(urlAnteriorRef.current);
      urlAnteriorRef.current = null;
    }
    setVista(null);
    setError(null);

    if (!huellaActual || !contextoActual) {
      setCargando(false);
      return undefined;
    }

    if (vistaHistorica) {
      if (vistaHistorica.huella !== huellaActual) {
        setCargando(true);
        return undefined;
      }

      const url = URL.createObjectURL(vistaHistorica.blob);
      urlAnteriorRef.current = url;
      setVista({ contexto: contextoActual, url, blob: vistaHistorica.blob, historicoId: vistaHistorica.id });
      setCargando(false);
      return undefined;
    }

    setCargando(true);
    const datosContexto = JSON.parse(huellaActual) as { imagenId: string; pipeline: Pipeline };
    const solicitudProcesamiento = {
      imagenId: datosContexto.imagenId,
      pipeline: datosContexto.pipeline,
    };
    let solicitudDelEfecto: ({ abort: () => void } & Promise<unknown>) | null = null;
    const temporizador = setTimeout(() => {
      const promesa = procesar(solicitudProcesamiento);
      solicitudDelEfecto = promesa;
      solicitudEnCursoRef.current = promesa;

      promesa
        .unwrap()
        .then((blob) => {
          if (contextoActualRef.current !== contextoActual || solicitudEnCursoRef.current !== promesa) return;
          const url = URL.createObjectURL(blob);
          if (urlAnteriorRef.current) URL.revokeObjectURL(urlAnteriorRef.current);
          urlAnteriorRef.current = url;
          setVista({ contexto: contextoActual, url, blob, historicoId: null });
          setError(null);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name === "AbortError") return;
          if (contextoActualRef.current !== contextoActual || solicitudEnCursoRef.current !== promesa) return;
          setError(extraerMensajeError(err));
        })
        .finally(() => {
          const esSolicitudActual = solicitudEnCursoRef.current === promesa;
          if (esSolicitudActual) solicitudEnCursoRef.current = null;
          if (esSolicitudActual && contextoActualRef.current === contextoActual) setCargando(false);
        });
    }, DEMORA_DEBOUNCE_MS);

    return () => {
      clearTimeout(temporizador);
      solicitudDelEfecto?.abort();
      if (solicitudEnCursoRef.current === solicitudDelEfecto) solicitudEnCursoRef.current = null;
    };
  }, [contextoActual, huellaActual, procesar, vistaHistorica]);

  useEffect(
    () => () => {
      solicitudEnCursoRef.current?.abort();
      if (urlAnteriorRef.current) URL.revokeObjectURL(urlAnteriorRef.current);
    },
    [],
  );

  return {
    urlImagen,
    blobImagen,
    vistaPreviaValida: blobImagen !== null,
    cargando,
    error,
  };
}
