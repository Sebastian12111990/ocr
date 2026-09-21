import { Box, Stack, Typography, useTheme } from "@mui/material";
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

import type { MetricaEpoca } from "../entrenamientos.types";

interface GraficoMetricasProps {
  metricas: MetricaEpoca[];
}

export function GraficoMetricas({ metricas }: GraficoMetricasProps) {
  const theme = useTheme();

  if (metricas.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Este entrenamiento no tiene métricas por época (es un sondeo o un pase de auto-etiquetado).
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Pérdida por época
        </Typography>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={metricas} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis dataKey="epoca" stroke={theme.palette.text.secondary} fontSize={12} />
            <YAxis stroke={theme.palette.text.secondary} fontSize={12} />
            <Tooltip
              contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="boxLoss" name="box_loss" stroke={theme.palette.error.main} dot />
            <Line type="monotone" dataKey="clsLoss" name="cls_loss" stroke={theme.palette.warning.main} dot />
            <Line type="monotone" dataKey="dflLoss" name="dfl_loss" stroke={theme.palette.primary.main} dot />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          mAP / Precision / Recall por época
        </Typography>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={metricas} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis dataKey="epoca" stroke={theme.palette.text.secondary} fontSize={12} />
            <YAxis domain={[0, 1]} stroke={theme.palette.text.secondary} fontSize={12} />
            <Tooltip
              contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="map50" name="mAP50" stroke={theme.palette.success.main} dot />
            <Line type="monotone" dataKey="map5095" name="mAP50-95" stroke={theme.palette.primary.main} dot />
            <Line type="monotone" dataKey="precision" name="precision" stroke={theme.palette.warning.main} dot />
            <Line type="monotone" dataKey="recall" name="recall" stroke={theme.palette.error.main} dot />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Stack>
  );
}
