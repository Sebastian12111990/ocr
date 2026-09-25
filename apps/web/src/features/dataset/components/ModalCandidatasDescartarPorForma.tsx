import { useState } from "react";
import { Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { CloseOutlined } from "@mui/icons-material";

import { GaleriaImagenes } from "./GaleriaImagenes";
import { useAccionesEtiquetaImagen } from "../hooks/useAccionesEtiquetaImagen";
import { useListarImagenesDescartarPorFormaQuery } from "../datasetApi";
import type { TipoEtiquetaResumen } from "../dataset.types";

interface Props {
  open: boolean;
  onClose: () => void;
  clase: string;
  relacionMin: number;
  relacionMax: number;
  confianzaMax: number | undefined;
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  tiposEtiqueta: TipoEtiquetaResumen[];
}

/** Auditoría de "Descartar por forma": las imágenes candidatas, con el mismo recuadro y los
 * mismos controles que la galería (click en la caja para marcar veredicto a mano en vez de
 * confiar en el bulk-write a ciegas) — ver PanelDescartarPorForma. */
export function ModalCandidatasDescartarPorForma({
  open,
  onClose,
  clase,
  relacionMin,
  relacionMax,
  confianzaMax,
  planta,
  fechaDesde,
  fechaHasta,
  tiposEtiqueta,
}: Props) {
  const [indiceEnfocado, setIndiceEnfocado] = useState(0);

  const { data: imagenes, isFetching } = useListarImagenesDescartarPorFormaQuery(
    {
      clase,
      relacionMin,
      relacionMax,
      confianzaMax,
      planta: planta || undefined,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
    },
    { skip: !open },
  );

  const { onToggleEtiqueta, onCicloVeredicto } = useAccionesEtiquetaImagen();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Candidatas a "Descartar por forma"
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Relación ancho/alto fuera de {relacionMin}–{relacionMax}
            {confianzaMax != null ? ` y confianza ≤ ${(confianzaMax * 100).toFixed(0)}%` : ""}. Marcá vos el
            veredicto de cada una acá, o cerrá y aplicá el bulk-write si ya confiás en el rango.
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseOutlined fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {isFetching && !imagenes ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : imagenes && imagenes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay cajas de "{clase}" pendientes con esa forma en este rango.
          </Typography>
        ) : (
          <GaleriaImagenes
            imagenes={imagenes ?? []}
            tiposEtiqueta={tiposEtiqueta}
            indiceEnfocado={indiceEnfocado}
            onEnfocar={setIndiceEnfocado}
            onCicloVeredicto={onCicloVeredicto}
            onToggleEtiqueta={onToggleEtiqueta}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
