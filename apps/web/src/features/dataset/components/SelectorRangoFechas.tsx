import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarMonth } from "@mui/icons-material";
import { Box, Button, IconButton, Popover, Stack, Tooltip, Typography } from "@mui/material";

import { useListarFechasDatasetQuery } from "../datasetApi";
import { ALTO_CAMPO_FILTRO } from "../dataset.types";

interface Props {
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  onCambiar: (fechaDesde: string, fechaHasta: string) => void;
}

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate();
}

/** 0 = lunes ... 6 = domingo, para alinear la grilla con encabezado Lu..Do. */
function offsetPrimerDia(anio: number, mes: number): number {
  return (new Date(anio, mes - 1, 1).getDay() + 6) % 7;
}

function formatearMes(anioMes: string): string {
  const [anio, mes] = anioMes.split("-").map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

function sumarMes(anioMes: string, delta: number): string {
  const [anio, mes] = anioMes.split("-").map(Number);
  const fecha = new Date(anio, mes - 1 + delta, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Calendario de un mes: solo se pueden elegir días que efectivamente tienen imágenes indexadas
 * (según `imagen_dataset`, no un rango arbitrario) y marca con un punto los días que ya tienen
 * detecciones cargadas — para saber de un vistazo qué falta procesar.
 */
export function SelectorRangoFechas({ planta, fechaDesde, fechaHasta, onCambiar }: Props) {
  const [ancla, setAncla] = useState<HTMLElement | null>(null);
  const [mesVisible, setMesVisible] = useState(() => (fechaDesde || new Date().toISOString()).slice(0, 7));

  const { data: fechas } = useListarFechasDatasetQuery({ planta }, { skip: !planta });
  const mapaFechas = useMemo(() => new Map((fechas ?? []).map((f) => [f.fecha, f])), [fechas]);

  // Acota la navegación a los meses que realmente tienen datos (ej. si solo hay 2025, no se
  // puede navegar a 2024 ni 2026) — evita mostrar un calendario vacío sin sentido.
  const { mesMin, mesMax } = useMemo(() => {
    if (!fechas || fechas.length === 0) return { mesMin: null, mesMax: null };
    const meses = fechas.map((f) => f.fecha.slice(0, 7)).sort();
    return { mesMin: meses[0], mesMax: meses[meses.length - 1] };
  }, [fechas]);

  const [anioVisible, mesVisibleNum] = mesVisible.split("-").map(Number);
  const total = diasEnMes(anioVisible, mesVisibleNum);
  const offset = offsetPrimerDia(anioVisible, mesVisibleNum);
  const celdas: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, i) => `${mesVisible}-${String(i + 1).padStart(2, "0")}`),
  ];

  const alAbrir = (evento: React.MouseEvent<HTMLElement>) => {
    // Sin fecha elegida todavía, arranca en el último mes con datos (no en "hoy" — hoy puede no
    // tener nada indexado, como pasa ahora que solo hay imágenes de 2025).
    if (fechaDesde) setMesVisible(fechaDesde.slice(0, 7));
    else if (mesMax) setMesVisible(mesMax);
    setAncla(evento.currentTarget);
  };

  const alClickDia = (fecha: string) => {
    const rangoUnDia = fechaDesde !== "" && fechaDesde === fechaHasta;
    const mismoMesQueInicio = fechaDesde !== "" && fecha.slice(0, 7) === fechaDesde.slice(0, 7);
    if (rangoUnDia && mismoMesQueInicio && fecha !== fechaDesde) {
      onCambiar(fecha < fechaDesde ? fecha : fechaDesde, fecha < fechaDesde ? fechaDesde : fecha);
    } else {
      onCambiar(fecha, fecha);
    }
  };

  const etiqueta = !planta
    ? "Elegí una planta"
    : fechaDesde === ""
      ? "Rango de fechas"
      : fechaDesde === fechaHasta
        ? fechaDesde
        : `${fechaDesde} a ${fechaHasta}`;

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<CalendarMonth fontSize="small" />}
        disabled={!planta}
        onClick={alAbrir}
        sx={{ width: "100%", height: ALTO_CAMPO_FILTRO, justifyContent: "flex-start" }}
      >
        {etiqueta}
      </Button>
      <Popover
        open={Boolean(ancla)}
        anchorEl={ancla}
        onClose={() => setAncla(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 1.5, width: 280 }}>
          <Stack direction="row" sx={{ mb: 1, alignItems: "center", justifyContent: "space-between" }}>
            <IconButton
              size="small"
              disabled={mesMin !== null && mesVisible <= mesMin}
              onClick={() => setMesVisible((m) => sumarMes(m, -1))}
            >
              <ChevronLeft fontSize="small" />
            </IconButton>
            <Typography variant="body2" sx={{ textTransform: "capitalize", fontWeight: 600 }}>
              {formatearMes(mesVisible)}
            </Typography>
            <IconButton
              size="small"
              disabled={mesMax !== null && mesVisible >= mesMax}
              onClick={() => setMesVisible((m) => sumarMes(m, 1))}
            >
              <ChevronRight fontSize="small" />
            </IconButton>
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
            {DIAS_SEMANA.map((dia) => (
              <Typography key={dia} variant="caption" align="center" sx={{ color: "text.secondary" }}>
                {dia}
              </Typography>
            ))}
            {celdas.map((fecha, indice) => {
              if (!fecha) return <Box key={`vacio-${indice}`} />;

              const info = mapaFechas.get(fecha);
              const tieneDatos = info !== undefined && info.total > 0;
              const procesadaCompleta = info !== undefined && info.total > 0 && info.procesadas >= info.total;
              const procesadaParcial = info !== undefined && info.procesadas > 0 && info.procesadas < info.total;
              const enRango = fechaDesde !== "" && fecha >= fechaDesde && fecha <= fechaHasta;
              const dia = Number(fecha.slice(8, 10));

              return (
                <Tooltip
                  key={fecha}
                  title={tieneDatos ? `${info.total} imágenes${info.procesadas > 0 ? `, ${info.procesadas} procesadas` : ""}` : "Sin imágenes indexadas"}
                >
                  <span>
                    <Box
                      component="button"
                      type="button"
                      disabled={!tieneDatos}
                      onClick={() => alClickDia(fecha)}
                      sx={{
                        width: "100%",
                        aspectRatio: "1",
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: enRango ? "primary.main" : "divider",
                        bgcolor: enRango ? "primary.main" : "transparent",
                        color: enRango ? "primary.contrastText" : tieneDatos ? "text.primary" : "text.disabled",
                        cursor: tieneDatos ? "pointer" : "not-allowed",
                        opacity: tieneDatos ? 1 : 0.35,
                        font: "inherit",
                        fontSize: "0.75rem",
                        position: "relative",
                        "&:hover": tieneDatos ? { borderColor: "primary.main" } : undefined,
                      }}
                    >
                      {dia}
                      {tieneDatos && !enRango && (
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: 2,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            bgcolor: procesadaCompleta ? "success.main" : procesadaParcial ? "warning.main" : "text.disabled",
                          }}
                        />
                      )}
                    </Box>
                  </span>
                </Tooltip>
              );
            })}
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, alignItems: "center" }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "success.main" }} />
              <Typography variant="caption" color="text.secondary">Procesado</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "warning.main" }} />
              <Typography variant="caption" color="text.secondary">Parcial</Typography>
            </Stack>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
