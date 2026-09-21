import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AppBar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

import { GraficoMetricas } from "../components/GraficoMetricas";
import { ListaEntrenamientos } from "../components/ListaEntrenamientos";
import {
  useListarEntrenamientosQuery,
  useObtenerDetalleEntrenamientoQuery,
  useObtenerMetricasEntrenamientoQuery,
} from "../entrenamientosApi";
import type { TipoEntrenamientoYolo } from "../entrenamientos.types";

export function EntrenamientosPage() {
  const [parametros] = useSearchParams();
  const tipo = parametros.get("tipo") as TipoEntrenamientoYolo | "" | null;

  const { data: entrenamientos, isLoading } = useListarEntrenamientosQuery();
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    if (!entrenamientos) return [];
    if (!tipo) return entrenamientos;
    return entrenamientos.filter((entrenamiento) => entrenamiento.tipo === tipo);
  }, [entrenamientos, tipo]);

  useEffect(() => {
    if (filtrados.length === 0) {
      setSeleccionadoId(null);
      return;
    }
    if (!filtrados.some((entrenamiento) => entrenamiento.id === seleccionadoId)) {
      setSeleccionadoId(filtrados[0]!.id);
    }
  }, [filtrados, seleccionadoId]);

  const { data: detalle } = useObtenerDetalleEntrenamientoQuery(seleccionadoId ?? "", { skip: !seleccionadoId });
  const { data: metricas, isFetching: cargandoMetricas } = useObtenerMetricasEntrenamientoQuery(seleccionadoId ?? "", {
    skip: !seleccionadoId || detalle?.tipo !== "entrenamiento",
  });

  return (
    <Stack sx={{ height: "100%" }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar variant="dense">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Entrenamientos YOLO
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Box sx={{ width: 380, overflow: "auto", borderRight: 1, borderColor: "divider" }}>
          {isLoading ? (
            <Box sx={{ p: 2.5 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <ListaEntrenamientos
              entrenamientos={filtrados}
              seleccionadoId={seleccionadoId}
              onSeleccionar={setSeleccionadoId}
            />
          )}
        </Box>

        <Box sx={{ flex: 1, overflow: "auto", p: 2.5 }}>
          {!detalle && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Seleccioná una corrida de la lista para ver el detalle.
            </Typography>
          )}

          {detalle && (
            <Stack spacing={2.5}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {detalle.nombre}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {detalle.modeloBase} · creado {new Date(detalle.creadoEn).toLocaleString("es-CL")}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Chip size="small" label={`Total imágenes: ${detalle.totalImagenes.toLocaleString("es-CL")}`} />
                  {detalle.imagenesConDeteccion !== null && (
                    <Chip
                      size="small"
                      label={`Con detección: ${detalle.imagenesConDeteccion.toLocaleString("es-CL")}`}
                    />
                  )}
                  {detalle.rutaPesos && <Chip size="small" label={`Pesos: ${detalle.rutaPesos}`} />}
                  {detalle.metricasFinales?.map50 !== undefined && (
                    <Chip size="small" color="success" label={`mAP50: ${detalle.metricasFinales.map50}`} />
                  )}
                  {detalle.metricasFinales?.map50_95 !== undefined && (
                    <Chip size="small" color="success" label={`mAP50-95: ${detalle.metricasFinales.map50_95}`} />
                  )}
                  {detalle.metricasFinales?.precision !== undefined && (
                    <Chip size="small" label={`Precision: ${detalle.metricasFinales.precision}`} />
                  )}
                  {detalle.metricasFinales?.recall !== undefined && (
                    <Chip size="small" label={`Recall: ${detalle.metricasFinales.recall}`} />
                  )}
                </Stack>
              </Paper>

              {detalle.tipo === "entrenamiento" && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Métricas por época
                  </Typography>
                  {cargandoMetricas ? <CircularProgress size={20} /> : <GraficoMetricas metricas={metricas ?? []} />}
                </Paper>
              )}

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Parámetros
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    fontFamily: "monospace",
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                    color: "text.secondary",
                  }}
                >
                  {JSON.stringify(detalle.parametros, null, 2)}
                </Box>
              </Paper>
            </Stack>
          )}
        </Box>
      </Box>
    </Stack>
  );
}
