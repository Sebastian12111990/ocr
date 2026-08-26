import { useEffect, useRef, useState } from "react";

import { extraerMensajeError } from "@/shared/utils/errores";
import { useProcesarMutation } from "./editorApi";
import type { Pipeline } from "./pipeline.types";

const DEMORA_DEBOUNCE_MS = 250;

/**
 * Refresca el preview automáticamente ~250ms después del último cambio del
 * pipeline, cancelando la petición anterior si todavía estaba en curso.
 */
export function useVistaPrevia(imagenId: string | null, pipeline: Pipeline) {
  const [procesar] = useProcesarMutation();
  const [urlImagen, setUrlImagen] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solicitudEnCursoRef = useRef<{ abort: () => void } | null>(null);
  const urlAnteriorRef = useRef<string | null>(null);

  const pipelineSerializado = JSON.stringify(pipeline);

  useEffect(() => {
    if (!imagenId) return undefined;

    setCargando(true);
    const temporizador = setTimeout(() => {
      solicitudEnCursoRef.current?.abort();

      const promesa = procesar({ imagenId, pipeline: JSON.parse(pipelineSerializado) });
      solicitudEnCursoRef.current = promesa;

      promesa
        .unwrap()
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          if (urlAnteriorRef.current) URL.revokeObjectURL(urlAnteriorRef.current);
          urlAnteriorRef.current = url;
          setUrlImagen(url);
          setError(null);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name === "AbortError") return;
          setError(extraerMensajeError(err));
        })
        .finally(() => setCargando(false));
    }, DEMORA_DEBOUNCE_MS);

    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagenId, pipelineSerializado]);

  useEffect(
    () => () => {
      if (urlAnteriorRef.current) URL.revokeObjectURL(urlAnteriorRef.current);
    },
    [],
  );

  return { urlImagen, cargando, error };
}
