import { useState } from "react";
import { Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { CloseOutlined } from "@mui/icons-material";

import { GaleriaImagenes } from "./GaleriaImagenes";
import { useAccionesEtiquetaImagen } from "../hooks/useAccionesEtiquetaImagen";
import { useListarImagenesDescartarPorTamanoRelativoQuery } from "../datasetApi";
import type { TipoEtiquetaResumen } from "../dataset.types";

interface Props {
  open: boolean;
  onClose: () => void;
  clase: string;
  relacionMaxima: number;
  anchoMaximoPx: number | undefined;
  altoMaximoPx: number | undefined;
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  tiposEtiqueta: TipoEtiquetaResumen[];
}

/** Auditoría de "Descartar por tamaño relativo": las imágenes candidatas, con el mismo recuadro y
 * los mismos controles que la galería — ver PanelDescartarPorTamanoRelativo. */
export function ModalCandidatasDescartarPorTamanoRelativo({
  open,
  onClose,
  clase,
  relacionMaxima,
  anchoMaximoPx,
  altoMaximoPx,
  planta,
  fechaDesde,
  fechaHasta,
  tiposEtiqueta,
}: Props) {
  const [indiceEnfocado, setIndiceEnfocado] = useState(0);

  const { data: imagenes, isFetching } = useListarImagenesDescartarPorTamanoRelativoQuery(
    {
      clase,
      relacionMaxima,
      anchoMaximoPx,
      altoMaximoPx,
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
            Candidatas a "Descartar por tamaño relativo"
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cajas de patente con área menor al {(relacionMaxima * 100).toFixed(0)}% de la mayor detección de
            patente en la misma imagen. Marcá vos el veredicto de cada una acá, o cerrá y aplicá el bulk-write
            si ya confiás en el umbral.
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
            No hay cajas de "{clase}" pendientes con ese tamaño relativo.
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
