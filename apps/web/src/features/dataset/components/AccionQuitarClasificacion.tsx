import CloseIcon from "@mui/icons-material/Close";
import { Button, Stack } from "@mui/material";

import { useCrearClasificacionMutation, useEliminarClasificacionMutation } from "../datasetApi";
import type { ImagenDataset } from "../dataset.types";

export function AccionQuitarClasificacion({
  imagen,
  clasificacionId,
  onAccion,
}: {
  imagen: ImagenDataset;
  clasificacionId: string;
  onAccion?: () => void;
}) {
  const [eliminar, { isLoading: quitando }] = useEliminarClasificacionMutation();
  const [clasificar, { isLoading: descartando }] = useCrearClasificacionMutation();

  return (
    <Stack direction="row" spacing={1}>
      <Button
        size="small"
        color="error"
        variant="outlined"
        startIcon={<CloseIcon fontSize="small" />}
        disabled={descartando}
        onClick={() => {
          onAccion?.();
          clasificar({ nombreArchivo: imagen.nombre, origen: imagen.origen, perspectiva: "descartada_sin_vehiculo" });
        }}
      >
        Descartar
      </Button>
      <Button
        size="small"
        color="inherit"
        variant="text"
        disabled={quitando}
        onClick={() => {
          onAccion?.();
          eliminar(clasificacionId);
        }}
      >
        Quitar (a pendientes)
      </Button>
    </Stack>
  );
}
