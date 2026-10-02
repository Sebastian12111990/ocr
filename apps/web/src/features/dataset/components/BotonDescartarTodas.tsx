import { useState } from "react";
import { Button, CircularProgress, Stack, Typography } from "@mui/material";
import { DeleteSweepOutlined } from "@mui/icons-material";

import { useDescartarPendientesMutation, useLazyPrevisualizarDescartarPendientesQuery } from "../datasetApi";
import type { FiltrosDescartarPendientes } from "../dataset.types";

interface Props {
  filtros: FiltrosDescartarPendientes;
  /** Se llama después de aplicar con éxito — el padre recarga la galería desde cero. */
  onAplicado: () => void;
}

/** Marca "Descartada" todas las imágenes de la pestaña Pendiente con los filtros actuales —
 * equivalente a apretar "Descartar" en cada una. Mismo patrón de dos clicks que
 * `BotonAceptarTodas`: el primero cuenta, el segundo aplica. */
export function BotonDescartarTodas({ filtros, onAplicado }: Props) {
  const [previsualizar, { data: previsualizacion, isFetching: cargando }] =
    useLazyPrevisualizarDescartarPendientesQuery();
  const [descartar, { isLoading: aplicando }] = useDescartarPendientesMutation();

  // Igual que en BotonAceptarTodas: un conteo pedido con otros filtros no se puede confirmar.
  const [clavePrevisualizada, setClavePrevisualizada] = useState<string | null>(null);
  const claveActual = JSON.stringify(filtros);
  const vigente = clavePrevisualizada === claveActual ? previsualizacion : undefined;

  const alPrevisualizar = () => {
    setClavePrevisualizada(claveActual);
    void previsualizar(filtros);
  };

  const alConfirmar = async () => {
    await descartar(filtros).unwrap();
    setClavePrevisualizada(null);
    onAplicado();
  };

  if (!vigente) {
    return (
      <Button
        size="small"
        variant="outlined"
        color="error"
        startIcon={cargando ? <CircularProgress size={14} /> : <DeleteSweepOutlined fontSize="small" />}
        disabled={cargando}
        title="Marca Descartada todas las imágenes pendientes de esta vista — no toca las ya aceptadas"
        onClick={alPrevisualizar}
      >
        Descartar todas
      </Button>
    );
  }

  if (vigente.candidatos === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        Nada pendiente para descartar.
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Button size="small" variant="contained" color="error" disabled={aplicando} onClick={() => void alConfirmar()}>
        Confirmar: descartar {vigente.candidatos.toLocaleString("es-CL")} imágenes
      </Button>
      <Button size="small" disabled={aplicando} onClick={() => setClavePrevisualizada(null)}>
        Cancelar
      </Button>
      {aplicando && <CircularProgress size={16} />}
    </Stack>
  );
}
