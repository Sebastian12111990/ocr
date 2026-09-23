import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Alert, Box, Button, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";

import type { AppDispatch } from "@/app/store";
import {
  datasetApi,
  useIniciarProcesamientoMutation,
  useListarModelosDatasetQuery,
  useObtenerEstadoProcesamientoQuery,
} from "../datasetApi";
import { ALTO_CAMPO_FILTRO, ANCHO_CAMPO_FILTRO } from "../dataset.types";

interface Props {
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
}

function mismoMes(fechaDesde: string, fechaHasta: string): boolean {
  return fechaDesde.slice(0, 7) === fechaHasta.slice(0, 7);
}

export function PanelProcesamiento({ planta, fechaDesde, fechaHasta }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { data: estadoProceso } = useObtenerEstadoProcesamientoQuery();
  const { data: modelos } = useListarModelosDatasetQuery();
  const [iniciarProcesamiento, { isLoading, error }] = useIniciarProcesamientoMutation();
  const [modelo, setModelo] = useState("");

  const activo = estadoProceso?.estado === "corriendo" || estadoProceso?.estado === "cargando";
  const modeloElegido = modelo || modelos?.[0]?.archivo || "";

  useEffect(() => {
    if (estadoProceso?.estado === "listo") {
      dispatch(datasetApi.util.invalidateTags(["ResumenDataset", { type: "ImagenDataset", id: "LISTA" }]));
    }
  }, [estadoProceso?.estado, dispatch]);

  const rangoValido = fechaDesde !== "" && fechaHasta !== "" && fechaDesde <= fechaHasta && mismoMes(fechaDesde, fechaHasta);
  const puedeProcesar = planta !== "" && rangoValido && modeloElegido !== "" && !activo;

  const alProcesar = () => {
    void iniciarProcesamiento({ planta, fechaDesde, fechaHasta, modelo: modeloElegido }).unwrap();
  };

  const porcentaje =
    estadoProceso && estadoProceso.total > 0 ? Math.round((estadoProceso.procesadas / estadoProceso.total) * 100) : 0;

  const mostrarEstado = Boolean(error) || activo || estadoProceso?.estado === "error" || estadoProceso?.estado === "listo";

  return (
    <>
      <TextField
        select
        size="small"
        label="Modelo"
        value={modeloElegido}
        onChange={(evento) => setModelo(evento.target.value)}
        disabled={activo}
        sx={{ width: ANCHO_CAMPO_FILTRO, "& .MuiInputBase-root": { height: ALTO_CAMPO_FILTRO } }}
      >
        {(modelos ?? []).map((m) => (
          <MenuItem key={m.archivo} value={m.archivo}>
            {m.etiqueta}
          </MenuItem>
        ))}
      </TextField>
      <Button
        variant="contained"
        size="small"
        disabled={!puedeProcesar || isLoading}
        onClick={alProcesar}
        title={
          planta === ""
            ? "Elegí una planta arriba"
            : !rangoValido
              ? "Elegí un rango de fechas dentro de un mismo mes"
              : "Corre YOLO sobre la planta y el rango de fechas elegidos"
        }
        sx={{ width: ANCHO_CAMPO_FILTRO, height: ALTO_CAMPO_FILTRO }}
      >
        Procesar
      </Button>

      {mostrarEstado && (
        <Box sx={{ flexBasis: "100%" }}>
          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {"data" in error && typeof error.data === "object" && error.data && "error" in error.data
                ? String((error.data as { error: unknown }).error)
                : "No se pudo iniciar el procesamiento"}
            </Alert>
          )}

          {activo && estadoProceso && (
            <Paper variant="outlined" sx={{ mt: 1, p: 1.5, borderRadius: 2, maxWidth: 420 }}>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", mb: 0.75 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {estadoProceso.estado === "cargando"
                    ? "Cargando detecciones en la base…"
                    : `Procesando ${estadoProceso.planta} (${estadoProceso.modelo})`}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {porcentaje}%
                </Typography>
              </Stack>
              <LinearProgress
                variant={estadoProceso.total > 0 ? "determinate" : "indeterminate"}
                value={porcentaje}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                {estadoProceso.fechaDesde === estadoProceso.fechaHasta
                  ? estadoProceso.fechaDesde
                  : `${estadoProceso.fechaDesde} a ${estadoProceso.fechaHasta}`}
                {" · "}
                {estadoProceso.procesadas.toLocaleString("es-CL")} / {estadoProceso.total.toLocaleString("es-CL")} imágenes
              </Typography>
            </Paper>
          )}

          {estadoProceso?.estado === "error" && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {estadoProceso.mensaje}
            </Alert>
          )}
          {estadoProceso?.estado === "listo" && !activo && (
            <Alert severity="success" sx={{ mt: 1 }}>
              Listo: {estadoProceso.detecciones?.toLocaleString("es-CL")} detecciones cargadas.
            </Alert>
          )}
        </Box>
      )}
    </>
  );
}
