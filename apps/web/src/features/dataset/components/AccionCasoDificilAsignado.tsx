import { Chip } from "@mui/material";

import { useEliminarClasificacionMutation } from "../datasetApi";
import type { ClasificacionImagen, MotivoCasoDificil } from "../dataset.types";

const ETIQUETAS_MOTIVO: Record<MotivoCasoDificil, string> = {
  brillo: "Brillo",
  suciedad: "Suciedad",
  otro: "Otro",
};

const ETIQUETAS_ORIGEN: Record<ClasificacionImagen["origen"], string> = {
  dataset: "Vehículos",
  sin_vehiculo: "Sin vehículo",
  sin_deteccion: "Sin detección",
};

export function AccionCasoDificilAsignado({
  clasificacion,
  onQuitar,
}: {
  clasificacion: ClasificacionImagen;
  onQuitar?: () => void;
}) {
  const [eliminar, { isLoading }] = useEliminarClasificacionMutation();

  return (
    <Chip
      size="small"
      color="warning"
      variant="outlined"
      label={`${ETIQUETAS_MOTIVO[clasificacion.motivo ?? "otro"]} · desde ${ETIQUETAS_ORIGEN[clasificacion.origen]}`}
      onDelete={
        isLoading
          ? undefined
          : () => {
              onQuitar?.();
              eliminar(clasificacion.id);
            }
      }
    />
  );
}
