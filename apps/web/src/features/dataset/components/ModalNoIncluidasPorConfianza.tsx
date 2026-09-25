import { useState } from "react";
import { Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { CloseOutlined } from "@mui/icons-material";

import { GaleriaImagenes } from "./GaleriaImagenes";
import { useAccionesEtiquetaImagen } from "../hooks/useAccionesEtiquetaImagen";
import { useListarImagenesDatasetQuery } from "../datasetApi";
import type { TipoEtiquetaResumen } from "../dataset.types";

const LIMITE = 100;

interface Props {
  open: boolean;
  onClose: () => void;
  clase: string;
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  confianzaMin: number;
  confianzaMax: number | null;
  tiposEtiqueta: TipoEtiquetaResumen[];
}

/** Auditoría de "Aceptar N como correctas": qué imágenes con caja pendiente de `clase` quedan
 * AFUERA del umbral elegido (confianza por debajo de `confianzaMin`), para revisarlas a mano en
 * vez de que queden invisibles. Reusa GaleriaImagenes con los mismos controles (chips de
 * revisión/calidad, click en caja para marcar veredicto) — mismas mutations, sin acumulación de
 * paginación propia: alcanza con dejar que RTK Query refetchee al invalidar. */
export function ModalNoIncluidasPorConfianza({
  open,
  onClose,
  clase,
  planta,
  fechaDesde,
  fechaHasta,
  confianzaMin,
  confianzaMax,
  tiposEtiqueta,
}: Props) {
  const [indiceEnfocado, setIndiceEnfocado] = useState(0);

  const { data: pagina, isFetching } = useListarImagenesDatasetQuery(
    {
      vista: "todas",
      planta: planta || undefined,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      confianzaMax: confianzaMin,
      confianzaClase: clase,
      limite: LIMITE,
    },
    { skip: !open },
  );

  const { onToggleEtiqueta, onCicloVeredicto } = useAccionesEtiquetaImagen();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Cajas que no entran en este umbral
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Confianza por debajo de {(confianzaMin * 100).toFixed(0)}%
            {confianzaMax != null
              ? " — no incluye las que quedan por encima del máximo elegido, esas se revisan aparte."
              : "."}{" "}
            Revisalas acá a mano o ajustá el umbral.
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseOutlined fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {pagina && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {pagina.total.toLocaleString("es-CL")} imágenes en total
            {pagina.siguienteCursor
              ? ` — mostrando las primeras ${LIMITE}, acotá planta/fecha para ver el resto.`
              : "."}
          </Typography>
        )}
        {isFetching && !pagina ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : pagina?.total === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No queda ninguna caja de "{clase}" pendiente por debajo de este umbral.
          </Typography>
        ) : (
          <GaleriaImagenes
            imagenes={pagina?.imagenes ?? []}
            tiposEtiqueta={tiposEtiqueta}
            indiceEnfocado={indiceEnfocado}
            onEnfocar={setIndiceEnfocado}
            onCicloVeredicto={onCicloVeredicto}
            onToggleEtiqueta={onToggleEtiqueta}
            filtroConfianza={{ clase, max: confianzaMin }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
