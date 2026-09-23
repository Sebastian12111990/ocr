import { Paper, Stack, Typography } from "@mui/material";

import { ETIQUETAS_VISTA } from "../dataset.types";
import type { ResumenDataset } from "../dataset.types";

export function ResumenDatasetCards({ resumen }: { resumen: ResumenDataset }) {
  const tarjetas: { etiqueta: string; valor: number }[] = [
    { etiqueta: "Total imágenes", valor: resumen.totalImagenes },
    { etiqueta: ETIQUETAS_VISTA.con_patente, valor: resumen.porVista.con_patente },
    { etiqueta: ETIQUETAS_VISTA.vehiculo_sin_patente, valor: resumen.porVista.vehiculo_sin_patente },
    { etiqueta: ETIQUETAS_VISTA.sin_vehiculo_con_patente, valor: resumen.porVista.sin_vehiculo_con_patente },
    { etiqueta: ETIQUETAS_VISTA.sin_deteccion, valor: resumen.porVista.sin_deteccion },
  ];

  return (
    <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
      {tarjetas.map((tarjeta) => (
        <Paper key={tarjeta.etiqueta} variant="outlined" sx={{ p: 1.5, minWidth: 150 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {tarjeta.etiqueta}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {tarjeta.valor.toLocaleString("es-CL")}
          </Typography>
        </Paper>
      ))}
    </Stack>
  );
}
