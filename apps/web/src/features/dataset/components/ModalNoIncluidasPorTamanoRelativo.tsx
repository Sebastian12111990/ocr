import { useState } from "react";
import { Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { CloseOutlined } from "@mui/icons-material";

import { GaleriaImagenes } from "./GaleriaImagenes";
import { useAccionesEtiquetaImagen } from "../hooks/useAccionesEtiquetaImagen";
import { useListarImagenesNoIncluidasPorTamanoRelativoQuery } from "../datasetApi";
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

/** Auditoría de "Descartar por tamaño relativo": imágenes donde una caja de patente pendiente
 * COMPITE con otra de la misma imagen (por eso podría ser sospechosa) pero el umbral actual no la
 * agarra — la zona gris que el bulk-write deja intacta. Verificado en la práctica que aflojar el
 * umbral agarra patentes reales de un segundo vehículo (ver PanelDescartarPorTamanoRelativo), así
 * que esta lista es la referencia de qué falta revisar a mano en vez de ensanchar el umbral. */
export function ModalNoIncluidasPorTamanoRelativo({
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

  const { data: imagenes, isFetching } = useListarImagenesNoIncluidasPorTamanoRelativoQuery(
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
            Cajas que compiten pero no entran en el umbral
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Hay otra caja de "{clase}" más grande en la misma imagen, pero esta no es lo bastante chica para
            el umbral actual — revisala a mano en vez de aflojar el umbral.
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
            No hay imágenes en esa zona gris con este filtro.
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
