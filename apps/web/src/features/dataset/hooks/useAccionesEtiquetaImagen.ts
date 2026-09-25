import { useCallback } from "react";

import {
  useAsignarEtiquetaMutation,
  useFijarVeredictoMutation,
  useQuitarEtiquetaMutation,
} from "../datasetApi";
import { CLAVE_DESCARTADA, CLAVE_REVISADA } from "../dataset.types";
import type { CajaDeteccion, ImagenDatasetResumida, VeredictoDeteccion } from "../dataset.types";

/** "Aceptada" y "Descartada" son mutuamente excluyentes: una imagen no puede quedar en los dos
 * estados de revisión a la vez. Se exporta porque `useGaleriaDataset` necesita la misma regla
 * para su update optimista local. */
export function etiquetaOpuesta(clave: string): string | null {
  if (clave === CLAVE_REVISADA) return CLAVE_DESCARTADA;
  if (clave === CLAVE_DESCARTADA) return CLAVE_REVISADA;
  return null;
}

export function siguienteVeredicto(actual: VeredictoDeteccion | null): VeredictoDeteccion | null {
  if (actual === null) return "correcta";
  if (actual === "correcta") return "falso_positivo";
  return null;
}

/** Núcleo de mutations para etiquetar/marcar veredicto, sin estado optimista local — lo agrega
 * quien lo necesite (ver `useGaleriaDataset`, que envuelve esto con su reducer). Sirve tal cual
 * para vistas secundarias que no acumulan paginación propia (p.ej. el modal de auditoría de
 * "aceptar por confianza"), donde alcanza con dejar que RTK Query invalide y refetchee. */
export function useAccionesEtiquetaImagen() {
  const [asignarEtiqueta] = useAsignarEtiquetaMutation();
  const [quitarEtiqueta] = useQuitarEtiquetaMutation();
  const [fijarVeredicto] = useFijarVeredictoMutation();

  const onToggleEtiqueta = useCallback(
    (imagen: ImagenDatasetResumida, clave: string) => {
      const yaAsignada = imagen.etiquetas.some((etiqueta) => etiqueta.clave === clave);
      if (yaAsignada) {
        void quitarEtiqueta({ imagenId: imagen.id, clave });
        return;
      }
      void asignarEtiqueta({ imagenId: imagen.id, clave });

      const opuesta = etiquetaOpuesta(clave);
      const opuestaAsignada =
        opuesta != null && imagen.etiquetas.some((etiqueta) => etiqueta.clave === opuesta);
      if (opuesta != null && opuestaAsignada) {
        void quitarEtiqueta({ imagenId: imagen.id, clave: opuesta });
      }
    },
    [asignarEtiqueta, quitarEtiqueta],
  );

  const onCicloVeredicto = useCallback(
    (imagen: ImagenDatasetResumida, caja: CajaDeteccion) => {
      const veredicto = siguienteVeredicto(caja.veredicto);
      void fijarVeredicto({ deteccionId: caja.id, imagenId: imagen.id, veredicto });
    },
    [fijarVeredicto],
  );

  return { onToggleEtiqueta, onCicloVeredicto };
}
