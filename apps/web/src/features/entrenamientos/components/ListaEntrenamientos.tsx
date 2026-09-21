import {
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";

import type { ResumenEntrenamiento, TipoEntrenamientoYolo } from "../entrenamientos.types";

const ETIQUETAS_TIPO: Record<TipoEntrenamientoYolo, string> = {
  sondeo: "Sondeo",
  auto_etiquetado: "Auto-etiquetado",
  entrenamiento: "Entrenamiento",
};

const COLOR_TIPO: Record<TipoEntrenamientoYolo, "info" | "warning" | "success"> = {
  sondeo: "info",
  auto_etiquetado: "warning",
  entrenamiento: "success",
};

function formatearDuracion(ms: number): string {
  const segundos = ms / 1000;
  if (segundos < 60) return `${segundos.toFixed(1)}s`;
  return `${(segundos / 60).toFixed(1)}min`;
}

export function ListaEntrenamientos({
  entrenamientos,
  seleccionadoId,
  onSeleccionar,
}: {
  entrenamientos: ResumenEntrenamiento[];
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
}) {
  if (entrenamientos.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No hay corridas para este filtro.
      </Typography>
    );
  }

  return (
    <List dense disablePadding>
      {entrenamientos.map((entrenamiento) => (
        <ListItemButton
          key={entrenamiento.id}
          selected={entrenamiento.id === seleccionadoId}
          onClick={() => onSeleccionar(entrenamiento.id)}
          sx={{ borderBottom: 1, borderColor: "divider", alignItems: "flex-start", py: 1.25 }}
        >
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {entrenamiento.nombre}
              </Typography>
            }
            secondary={
              <>
                <Chip
                  size="small"
                  label={ETIQUETAS_TIPO[entrenamiento.tipo]}
                  color={COLOR_TIPO[entrenamiento.tipo]}
                  variant="outlined"
                  sx={{ mr: 1, mt: 0.5 }}
                />
                <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                  {entrenamiento.modeloBase} · {entrenamiento.totalImagenes.toLocaleString("es-CL")} imágenes
                  {entrenamiento.imagenesConDeteccion !== null &&
                    ` · ${entrenamiento.imagenesConDeteccion.toLocaleString("es-CL")} con detección`}
                  {" · "}
                  {formatearDuracion(entrenamiento.duracionMs)}
                </Typography>
              </>
            }
          />
        </ListItemButton>
      ))}
    </List>
  );
}
