import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { GraficoMetricas } from "../components/GraficoMetricas";
import { TablaEntrenamientos } from "../components/TablaEntrenamientos";
import {
  useListarEntrenamientosQuery,
  useObtenerMetricasEntrenamientoQuery,
} from "../entrenamientosApi";
import type { ResumenEntrenamiento, TipoEntrenamientoYolo } from "../entrenamientos.types";

export function EntrenamientosPage() {
  const [searchParams] = useSearchParams();
  const tipoFiltro = searchParams.get("tipo") as TipoEntrenamientoYolo | null;

  const { data: entrenamientos, isLoading, isError } = useListarEntrenamientosQuery();
  const [seleccionado, setSeleccionado] = useState<ResumenEntrenamiento | null>(null);

  const entrenamientosFiltrados = useMemo(
    () => (tipoFiltro ? (entrenamientos ?? []).filter((e) => e.tipo === tipoFiltro) : entrenamientos ?? []),
    [entrenamientos, tipoFiltro],
  );

  useEffect(() => {
    setSeleccionado(entrenamientosFiltrados[0] ?? null);
  }, [entrenamientosFiltrados]);

  const { data: metricas, isFetching: cargandoMetricas } = useObtenerMetricasEntrenamientoQuery(
    seleccionado?.id ?? "",
    { skip: !seleccionado },
  );

  return (
    <Stack sx={{ height: "100%" }}>
      <Box sx={{ p: 2.5, overflow: "auto", flex: 1 }}>
        {isLoading && <CircularProgress size={24} />}
        {isError && (
          <Typography variant="body2" color="error">
            No se pudieron cargar los entrenamientos.
          </Typography>
        )}

        {entrenamientos && (
          <Stack spacing={2.5}>
            <TablaEntrenamientos
              entrenamientos={entrenamientosFiltrados}
              seleccionadoId={seleccionado?.id ?? null}
              onSeleccionar={setSeleccionado}
            />

            {seleccionado && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {seleccionado.nombre}
                    </Typography>
                    {seleccionado.metricasFinales?.map50 !== undefined && (
                      <Chip size="small" color="success" label={`mAP50: ${seleccionado.metricasFinales.map50.toFixed(3)}`} />
                    )}
                    {seleccionado.metricasFinales?.map50_95 !== undefined && (
                      <Chip size="small" label={`mAP50-95: ${seleccionado.metricasFinales.map50_95.toFixed(3)}`} />
                    )}
                    {seleccionado.metricasFinales?.precision !== undefined && (
                      <Chip size="small" label={`Precision: ${seleccionado.metricasFinales.precision.toFixed(3)}`} />
                    )}
                    {seleccionado.metricasFinales?.recall !== undefined && (
                      <Chip size="small" label={`Recall: ${seleccionado.metricasFinales.recall.toFixed(3)}`} />
                    )}
                  </Stack>

                  <Divider />

                  {cargandoMetricas ? (
                    <CircularProgress size={20} />
                  ) : (
                    <GraficoMetricas metricas={metricas ?? []} />
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
