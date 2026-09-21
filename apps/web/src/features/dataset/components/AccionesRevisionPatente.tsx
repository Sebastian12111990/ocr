import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { Stack, Button } from "@mui/material";

import { useCrearClasificacionMutation } from "../datasetApi";
import type { ImagenDataset } from "../dataset.types";

export function AccionesRevisionPatente({ imagen, onAccion }: { imagen: ImagenDataset; onAccion?: () => void }) {
  const [clasificar, { isLoading }] = useCrearClasificacionMutation();

  return (
    <Stack direction="row" spacing={1}>
      <Button
        size="small"
        color="success"
        variant="outlined"
        startIcon={<CheckIcon fontSize="small" />}
        disabled={isLoading}
        onClick={() => {
          onAccion?.();
          clasificar({ nombreArchivo: imagen.nombre, origen: imagen.origen, perspectiva: "patente_sin_vehiculo" });
        }}
      >
        Aceptar
      </Button>
      <Button
        size="small"
        color="error"
        variant="outlined"
        startIcon={<CloseIcon fontSize="small" />}
        disabled={isLoading}
        onClick={() => {
          onAccion?.();
          clasificar({ nombreArchivo: imagen.nombre, origen: imagen.origen, perspectiva: "descartada_sin_vehiculo" });
        }}
      >
        Descartar
      </Button>
    </Stack>
  );
}
