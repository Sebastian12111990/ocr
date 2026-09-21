import { Paper, Stack, Typography } from "@mui/material";

import type { ResumenDataset } from "../dataset.types";

interface Tarjeta {
  etiqueta: string;
  valor: number;
  color?: "success.main" | "warning.main" | "error.main" | "text.primary";
}

export function ResumenDatasetCards({ resumen }: { resumen: ResumenDataset }) {
  const tarjetas: Tarjeta[] = [
    { etiqueta: "Total imágenes leídas", valor: resumen.totalImagenes, color: "text.primary" },
    { etiqueta: "Con vehículo (dataset)", valor: resumen.dataset, color: "success.main" },
    { etiqueta: "Sin vehículo", valor: resumen.sinVehiculo, color: "warning.main" },
    { etiqueta: "Sin detección de patente", valor: resumen.sinDeteccion, color: "error.main" },
    { etiqueta: "Labels con caja", valor: resumen.labelsConContenido, color: "success.main" },
    { etiqueta: "Labels vacíos", valor: resumen.labelsVacios, color: "text.primary" },
  ];

  return (
    <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
      {tarjetas.map((tarjeta) => (
        <Paper key={tarjeta.etiqueta} variant="outlined" sx={{ p: 1.5, minWidth: 150 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {tarjeta.etiqueta}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: tarjeta.color, fontVariantNumeric: "tabular-nums" }}>
            {tarjeta.valor.toLocaleString("es-CL")}
          </Typography>
        </Paper>
      ))}
    </Stack>
  );
}
