import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useForm, useWatch } from "react-hook-form";
import { Box, Button, LinearProgress, Paper, Stack, Typography } from "@mui/material";

import type { AppDispatch } from "@/app/store";
import { UkoAlert } from "@/shared/componentes/feedback";
import { FormProvider, RHFAutocomplete, type OpcionAutocomplete } from "@/shared/componentes/rhf";
import {
  datasetApi,
  useIniciarProcesamientoMutation,
  useListarModelosDatasetQuery,
  useObtenerEstadoProcesamientoQuery,
} from "../datasetApi";
import { ALTO_CAMPO_FILTRO } from "../dataset.types";

interface Props {
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
}

interface OpcionModelo extends OpcionAutocomplete {
  code: string;
  name: string;
}

interface FormularioProcesamiento {
  modelo: OpcionModelo | null;
}

function mismoMes(fechaDesde: string, fechaHasta: string): boolean {
  return fechaDesde.slice(0, 7) === fechaHasta.slice(0, 7);
}

export function PanelProcesamiento({ planta, fechaDesde, fechaHasta }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { data: estadoProceso } = useObtenerEstadoProcesamientoQuery();
  const { data: modelos } = useListarModelosDatasetQuery();
  const [iniciarProcesamiento, { isLoading, error }] = useIniciarProcesamientoMutation();

  const methods = useForm<FormularioProcesamiento>({ defaultValues: { modelo: null } });
  const modeloOpcion = useWatch({ control: methods.control, name: "modelo" });
  const modeloElegido = modeloOpcion?.code ?? "";

  const activo = estadoProceso?.estado === "corriendo" || estadoProceso?.estado === "cargando";

  // Preselecciona el primer modelo apenas carga la lista, solo si el usuario no eligió otro antes.
  const primerModeloAplicado = useRef(false);
  useEffect(() => {
    if (primerModeloAplicado.current || !modelos || modelos.length === 0) return;
    methods.setValue("modelo", { code: modelos[0].archivo, name: modelos[0].etiqueta });
    primerModeloAplicado.current = true;
  }, [modelos]);

  useEffect(() => {
    if (estadoProceso?.estado === "listo") {
      dispatch(datasetApi.util.invalidateTags(["ResumenDataset", { type: "ImagenDataset", id: "LISTA" }]));
    }
  }, [estadoProceso?.estado, dispatch]);

  const rangoValido = fechaDesde !== "" && fechaHasta !== "" && fechaDesde <= fechaHasta && mismoMes(fechaDesde, fechaHasta);
  const puedeProcesar = planta !== "" && rangoValido && modeloElegido !== "" && !activo;

  // El POST responde con el estado "corriendo" ya calculado (ver iniciarProcesamiento en el
  // backend) — escribirlo directo en la caché de `obtenerEstadoProcesamiento` deshabilita el botón
  // al toque, sin esperar el viaje de ida y vuelta del WebSocket. Si no se hace esto, hay una
  // ventana (mientras no llega el próximo mensaje del socket) donde el botón sigue habilitado y
  // parece que el click no hizo nada — tentando a hacer doble click y chocar con "ya hay un
  // procesamiento en curso" aunque el primero sí haya arrancado.
  const alProcesar = async () => {
    try {
      const estado = await iniciarProcesamiento({ planta, fechaDesde, fechaHasta, modelo: modeloElegido }).unwrap();
      dispatch(datasetApi.util.upsertQueryData("obtenerEstadoProcesamiento", undefined, estado));
    } catch {
      // El hook de la mutation ya guarda el error y se muestra abajo — nada más que hacer acá.
    }
  };

  const porcentaje =
    estadoProceso && estadoProceso.total > 0 ? Math.round((estadoProceso.procesadas / estadoProceso.total) * 100) : 0;

  const mostrarEstado = Boolean(error) || activo || estadoProceso?.estado === "error" || estadoProceso?.estado === "listo";

  return (
    <FormProvider methods={methods}>
      <RHFAutocomplete<FormularioProcesamiento, OpcionModelo>
        name="modelo"
        label="Modelo"
        disabled={activo}
        options={(modelos ?? []).map((m) => ({ code: m.archivo, name: m.etiqueta }))}
        sx={{ width: "100%", "& .MuiInputBase-root": { height: ALTO_CAMPO_FILTRO } }}
      />
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
        sx={{ width: "100%", height: ALTO_CAMPO_FILTRO }}
      >
        Procesar
      </Button>

      {mostrarEstado && (
        <Box sx={{ gridColumn: "1 / -1" }}>
          {error && (
            <UkoAlert severity="error" title="No se pudo iniciar" sx={{ mt: 1 }}>
              {"data" in error && typeof error.data === "object" && error.data && "error" in error.data
                ? String((error.data as { error: unknown }).error)
                : "No se pudo iniciar el procesamiento"}
            </UkoAlert>
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

          {/* Si el click actual falló (p.ej. "ya hay un procesamiento en curso"), no mezclar ese
              error con el resultado LISTO de una corrida anterior — confunde cuál es cuál. */}
          {!error && estadoProceso?.estado === "error" && (
            <UkoAlert severity="error" title="Procesamiento interrumpido" sx={{ mt: 1 }}>
              {estadoProceso.mensaje}
            </UkoAlert>
          )}
          {!error && estadoProceso?.estado === "listo" && !activo && (
            <UkoAlert severity="success" title="Procesamiento completado" sx={{ mt: 1 }}>
              Listo: {estadoProceso.detecciones?.toLocaleString("es-CL")} detecciones cargadas.
              {estadoProceso.mensaje && ` ${estadoProceso.mensaje}`}
            </UkoAlert>
          )}
        </Box>
      )}
    </FormProvider>
  );
}
