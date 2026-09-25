import { useState } from "react";
import { Button, CircularProgress, Stack, Typography } from "@mui/material";
import { DoneAllOutlined } from "@mui/icons-material";

import { useAceptarTodasMutation, useLazyPrevisualizarAceptarTodasQuery } from "../datasetApi";
import type { VistaDataset } from "../dataset.types";

interface Props {
  vista: VistaDataset;
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  etiqueta: string;
  /** Se llama después de aplicar con éxito — el padre recarga la galería desde cero. */
  onAplicado: () => void;
}

function clavesFiltros(props: Omit<Props, "onAplicado">): string {
  return JSON.stringify(props);
}

/** Acepta en bloque ('correcta') todas las cajas de patente pendientes de la vista/filtro
 * actual — equivalente a hacer click en cada caja de cada imagen y marcarla correcta, sin tener
 * que revisarlas una por una. Las imágenes marcadas "Descartada" quedan afuera. Dos clicks por
 * seguridad: el primero solo cuenta cuántas cajas entrarían, el segundo aplica. */
export function BotonAceptarTodas(props: Props) {
  const { vista, planta, fechaDesde, fechaHasta, etiqueta, onAplicado } = props;
  const [previsualizar, { data: previsualizacion, isFetching: cargando }] =
    useLazyPrevisualizarAceptarTodasQuery();
  const [aceptar, { isLoading: aplicando }] = useAceptarTodasMutation();

  // La previsualización queda obsoleta apenas cambia cualquier filtro: se guarda contra qué
  // combinación de filtros se pidió, y si ya no coincide se vuelve a pedir en vez de confirmar a
  // ciegas un conteo que ya no corresponde a lo que se está viendo.
  const [clavePrevisualizada, setClavePrevisualizada] = useState<string | null>(null);
  const claveActual = clavesFiltros({ vista, planta, fechaDesde, fechaHasta, etiqueta });
  const vigente = clavePrevisualizada === claveActual ? previsualizacion : undefined;

  const filtrosActuales = () => ({
    vista,
    planta: planta || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
    etiqueta: etiqueta || undefined,
  });

  const alPrevisualizar = () => {
    setClavePrevisualizada(claveActual);
    void previsualizar(filtrosActuales());
  };

  const alConfirmar = async () => {
    await aceptar(filtrosActuales()).unwrap();
    onAplicado();
  };

  if (!vigente) {
    return (
      <Button
        size="small"
        variant="outlined"
        startIcon={cargando ? <CircularProgress size={14} /> : <DoneAllOutlined fontSize="small" />}
        disabled={cargando}
        title="Acepta todas las cajas de patente pendientes en esta vista — no toca las imágenes marcadas Descartada"
        onClick={alPrevisualizar}
      >
        Aceptar todas
      </Button>
    );
  }

  if (vigente.candidatos === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        Nada pendiente para aceptar en esta vista.
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Button
        size="small"
        variant="contained"
        color="warning"
        disabled={aplicando}
        onClick={() => void alConfirmar()}
      >
        Confirmar: aceptar {vigente.candidatos.toLocaleString("es-CL")} patentes
      </Button>
      {aplicando && <CircularProgress size={16} />}
    </Stack>
  );
}
