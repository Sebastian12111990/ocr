import { useEffect } from "react";

import { CLAVE_DESCARTADA, CLAVE_REVISADA, cajasPatente } from "../dataset.types";
import type { CajaDeteccion, ImagenDatasetResumida } from "../dataset.types";

interface OpcionesAtajosGaleria {
  imagenes: ImagenDatasetResumida[];
  indiceEnfocado: number;
  setIndiceEnfocado: (indice: number) => void;
  onToggleEtiqueta: (imagen: ImagenDatasetResumida, clave: string) => void;
  onCicloVeredicto: (imagen: ImagenDatasetResumida, caja: CajaDeteccion) => void;
}

/** Atajos sobre la imagen enfocada: ←/→ mueven el foco, 1-9 ciclan el veredicto de la caja N
 * (ver el número dibujado en GaleriaImagenes cuando hay más de una), r/d marcan
 * revisada/descartada. Se ignoran si el foco del navegador está en un campo de texto/select
 * (filtros, popover de fechas) para no interceptar la escritura ni la navegación de esos menús. */
export function useAtajosGaleria({
  imagenes,
  indiceEnfocado,
  setIndiceEnfocado,
  onToggleEtiqueta,
  onCicloVeredicto,
}: OpcionesAtajosGaleria) {
  // Sin array de dependencias a propósito: se re-suscribe en cada render para no cerrar sobre
  // valores viejos de `imagenes`/`indiceEnfocado` (la alternativa sería listarlos todos acá).
  useEffect(() => {
    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
      const activo = document.activeElement;
      if (
        activo?.closest(
          "input, textarea, [contenteditable='true'], [role='combobox'], [role='listbox']",
        )
      )
        return;
      if (imagenes.length === 0) return;

      if (evento.key === "ArrowRight") {
        evento.preventDefault();
        setIndiceEnfocado(Math.min(indiceEnfocado + 1, imagenes.length - 1));
        return;
      }
      if (evento.key === "ArrowLeft") {
        evento.preventDefault();
        setIndiceEnfocado(Math.max(indiceEnfocado - 1, 0));
        return;
      }

      const imagenEnfocada = imagenes[indiceEnfocado];
      if (!imagenEnfocada) return;

      if (evento.key === "r") {
        evento.preventDefault();
        onToggleEtiqueta(imagenEnfocada, CLAVE_REVISADA);
        return;
      }
      if (evento.key === "d") {
        evento.preventDefault();
        onToggleEtiqueta(imagenEnfocada, CLAVE_DESCARTADA);
        return;
      }

      const indiceCaja = Number(evento.key) - 1;
      const cajas = cajasPatente(imagenEnfocada.cajas);
      if (Number.isInteger(indiceCaja) && indiceCaja >= 0 && indiceCaja < cajas.length) {
        evento.preventDefault();
        onCicloVeredicto(imagenEnfocada, cajas[indiceCaja]);
      }
    };

    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  });
}
