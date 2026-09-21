import { Box, Typography } from "@mui/material";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MetricaEpocaRespuesta } from "../entrenamientos.types";

export function GraficoMetricas({ metricas }: { metricas: MetricaEpocaRespuesta[] }) {
  if (metricas.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No hay métricas por época para este entrenamiento.
      </Typography>
    );
  }

  return (
    <Box sx={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={metricas} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="epoca" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="boxLoss" name="box_loss" stroke="#ef5350" dot={false} />
          <Line type="monotone" dataKey="clsLoss" name="cls_loss" stroke="#ffa726" dot={false} />
          <Line type="monotone" dataKey="dflLoss" name="dfl_loss" stroke="#ab47bc" dot={false} />
          <Line type="monotone" dataKey="map50" name="mAP50" stroke="#66bb6a" dot={false} />
          <Line type="monotone" dataKey="map5095" name="mAP50-95" stroke="#26a69a" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
