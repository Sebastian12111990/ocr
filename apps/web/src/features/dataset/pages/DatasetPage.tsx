import { useMemo } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { ClearOutlined } from "@mui/icons-material";

import { FormProvider, RHFAutocomplete, RHFTextField } from "@/shared/componentes/rhf";
import { UkoSectionCard } from "@/shared/componentes/cards";
import { UkoFilterPanel } from "@/shared/componentes/filters";
import { UkoTabs } from "@/shared/componentes/tabs";

import { BotonAceptarTodas } from "../components/BotonAceptarTodas";
import { BotonDescartarTodas } from "../components/BotonDescartarTodas";
import { GaleriaImagenes } from "../components/GaleriaImagenes";
import { PanelAceptarPorConfianza } from "../components/PanelAceptarPorConfianza";
import { PanelDescartarPorForma } from "../components/PanelDescartarPorForma";
import { PanelDescartarPorTamanoRelativo } from "../components/PanelDescartarPorTamanoRelativo";
import { PanelProcesamiento } from "../components/PanelProcesamiento";
import { ResumenDatasetCards } from "../components/ResumenDatasetCards";
import { SelectorRangoFechas } from "../components/SelectorRangoFechas";
import { useAltoEncabezado } from "../hooks/useAltoEncabezado";
import { useAtajosGaleria } from "../hooks/useAtajosGaleria";
import {
  useFiltrosDataset,
  VISTAS,
  type FiltrosDatasetForm,
  type OpcionFiltro,
} from "../hooks/useFiltrosDataset";
import { useGaleriaDataset } from "../hooks/useGaleriaDataset";
import {
  useListarTiposEtiquetaQuery,
  useObtenerResumenDatasetQuery,
} from "../datasetApi";
import { ALTO_CAMPO_FILTRO, CLASE_PATENTE, ETIQUETAS_VISTA } from "../dataset.types";
import type { VistaDataset } from "../dataset.types";

export function DatasetPage() {
  const { methods, filtros, setVista, limpiarFiltros, hayFiltrosActivos } = useFiltrosDataset();
  const { ref: refEncabezado, alto: altoEncabezadoFijo } = useAltoEncabezado<HTMLDivElement>();

  const { data: resumen, isLoading: cargandoResumen } = useObtenerResumenDatasetQuery({
    planta: filtros.planta || undefined,
    fechaDesde: filtros.fechaDesde || undefined,
    fechaHasta: filtros.fechaHasta || undefined,
  });
  const { data: tiposEtiqueta } = useListarTiposEtiquetaQuery();

  const {
    imagenes,
    total,
    indiceVisible,
    indiceEnfocado,
    setIndiceEnfocado,
    cargandoImagenes,
    refContenedor,
    refGaleria,
    alHacerScroll,
    resetearGaleria,
    onToggleEtiqueta,
    onCicloVeredicto,
  } = useGaleriaDataset(filtros, altoEncabezadoFijo);

  useAtajosGaleria({
    imagenes,
    indiceEnfocado,
    setIndiceEnfocado,
    onToggleEtiqueta,
    onCicloVeredicto,
  });

  const plantas = useMemo(
    () =>
      (resumen?.porPlanta ?? []).filter(
        (fila): fila is { planta: string; total: number } => fila.planta !== null,
      ),
    [resumen],
  );

  return (
    <Stack sx={{ height: "100%" }}>
      <Box
        ref={refContenedor}
        onScroll={alHacerScroll}
        sx={{ overflow: "auto", flex: 1 }}
      >
        <Stack spacing={2.5} sx={{ p: 2.5 }}>
          <Box
            ref={refEncabezado}
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 3,
              bgcolor: "background.default",
            }}
          >
            <UkoSectionCard
              title="Resumen del dataset"
              subtitle="Métricas generales, filtros y estado del procesamiento."
              contentSx={{ p: 2 }}
              collapsible
            >
              {cargandoResumen && <CircularProgress size={24} />}
              {resumen && <ResumenDatasetCards resumen={resumen} />}

              <FormProvider methods={methods}>
                <UkoFilterPanel
                  title="Filtros del dataset"
                  subtitle="Acota las imágenes y ejecuta el procesamiento sobre el rango seleccionado."
                  minColumnWidth={165}
                  embedded
                  actions={
                    <Button
                      size="small"
                      startIcon={<ClearOutlined />}
                      disabled={!hayFiltrosActivos}
                      onClick={limpiarFiltros}
                    >
                      Limpiar filtros
                    </Button>
                  }
                >
                  <RHFAutocomplete<FiltrosDatasetForm, OpcionFiltro>
                    name="planta"
                    label="Planta"
                    options={plantas.map((fila) => ({
                      code: fila.planta,
                      name: `${fila.planta} (${fila.total.toLocaleString("es-CL")})`,
                    }))}
                    sx={{
                      width: "100%",
                      "& .MuiInputBase-root": { height: ALTO_CAMPO_FILTRO },
                    }}
                  />
                  <SelectorRangoFechas
                    planta={filtros.planta}
                    fechaDesde={filtros.fechaDesde}
                    fechaHasta={filtros.fechaHasta}
                    onCambiar={(desde, hasta) => {
                      methods.setValue("fechaDesde", desde);
                      methods.setValue("fechaHasta", hasta);
                    }}
                  />
                  <RHFAutocomplete<FiltrosDatasetForm, OpcionFiltro>
                    name="etiquetaFiltro"
                    label="Etiqueta"
                    options={(tiposEtiqueta ?? []).map((tipo) => ({
                      code: tipo.clave,
                      name: tipo.nombre,
                    }))}
                    sx={{
                      width: "100%",
                      "& .MuiInputBase-root": { height: ALTO_CAMPO_FILTRO },
                    }}
                  />
                  <RHFTextField<FiltrosDatasetForm>
                    name="confianzaMinPct"
                    type="number"
                    size="small"
                    label="Confianza mín. %"
                    slotProps={{ htmlInput: { min: 0, max: 100 } }}
                    sx={{
                      width: "100%",
                      "& .MuiInputBase-root": { height: ALTO_CAMPO_FILTRO },
                    }}
                  />
                  <RHFTextField<FiltrosDatasetForm>
                    name="confianzaMaxPct"
                    type="number"
                    size="small"
                    label="máx. % (opcional)"
                    slotProps={{ htmlInput: { min: 0, max: 100 } }}
                    sx={{
                      width: "100%",
                      "& .MuiInputBase-root": { height: ALTO_CAMPO_FILTRO },
                    }}
                  />
                  <PanelProcesamiento
                    planta={filtros.planta}
                    fechaDesde={filtros.fechaDesde}
                    fechaHasta={filtros.fechaHasta}
                  />
                  <Box
                    sx={{
                      gridColumn: "1 / -1",
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "minmax(0, 1fr)",
                        lg: "repeat(auto-fit, minmax(320px, 1fr))",
                      },
                      gap: 1.5,
                      alignItems: "stretch",
                    }}
                  >
                    {filtros.confianzaMin !== undefined && (
                      <PanelAceptarPorConfianza
                        clase={CLASE_PATENTE}
                        planta={filtros.planta}
                        fechaDesde={filtros.fechaDesde}
                        fechaHasta={filtros.fechaHasta}
                        confianzaMin={filtros.confianzaMin}
                        confianzaMax={filtros.confianzaMax ?? null}
                        tiposEtiqueta={tiposEtiqueta ?? []}
                        onAplicado={resetearGaleria}
                      />
                    )}
                    <PanelDescartarPorForma
                      planta={filtros.planta}
                      fechaDesde={filtros.fechaDesde}
                      fechaHasta={filtros.fechaHasta}
                      confianzaMax={filtros.confianzaMin}
                      tiposEtiqueta={tiposEtiqueta ?? []}
                      onAplicado={resetearGaleria}
                    />
                    <PanelDescartarPorTamanoRelativo
                      planta={filtros.planta}
                      fechaDesde={filtros.fechaDesde}
                      fechaHasta={filtros.fechaHasta}
                      tiposEtiqueta={tiposEtiqueta ?? []}
                      onAplicado={resetearGaleria}
                    />
                  </Box>
                </UkoFilterPanel>
              </FormProvider>
            </UkoSectionCard>
          </Box>

          <UkoSectionCard
            actions={
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  Viendo imagen {indiceVisible || Math.min(1, imagenes.length)} de {total.toLocaleString("es-CL")}
                </Typography>
                {filtros.vista === "pendiente" && (
                  <BotonDescartarTodas
                    filtros={{
                      planta: filtros.planta || undefined,
                      fechaDesde: filtros.fechaDesde || undefined,
                      fechaHasta: filtros.fechaHasta || undefined,
                      etiqueta: filtros.etiquetaFiltro || undefined,
                      confianzaMin: filtros.confianzaMin,
                      confianzaMax: filtros.confianzaMax,
                      confianzaClase: filtros.confianzaMin !== undefined ? CLASE_PATENTE : undefined,
                    }}
                    onAplicado={resetearGaleria}
                  />
                )}
                <BotonAceptarTodas
                  vista={filtros.vista}
                  planta={filtros.planta}
                  fechaDesde={filtros.fechaDesde}
                  fechaHasta={filtros.fechaHasta}
                  etiqueta={filtros.etiquetaFiltro}
                  onAplicado={resetearGaleria}
                />
              </Stack>
            }
            navigation={
              <UkoTabs<VistaDataset>
                value={filtros.vista}
                onChange={setVista}
                items={VISTAS.map((valor) => ({
                  value: valor,
                  label: ETIQUETAS_VISTA[valor],
                  count: resumen?.porVista[valor] ?? 0,
                  tone:
                    valor === "pendiente"
                      ? "warning"
                      : valor === "aceptada"
                        ? "success"
                        : valor === "descartada"
                          ? "error"
                          : valor === "todas"
                            ? "neutral"
                            : "info",
                  groupStart: valor === "vehiculo_con_patente" || valor === "pendiente",
                }))}
                idPrefix="dataset-vista"
              />
            }
            contentSx={{ p: 1.5 }}
            headerSticky
            headerTop={altoEncabezadoFijo}
          >
            <Box ref={refGaleria}>
              <GaleriaImagenes
                imagenes={imagenes}
                tiposEtiqueta={tiposEtiqueta ?? []}
                indiceEnfocado={indiceEnfocado}
                onEnfocar={setIndiceEnfocado}
                onCicloVeredicto={onCicloVeredicto}
                onToggleEtiqueta={onToggleEtiqueta}
                filtroConfianza={
                  filtros.confianzaMin !== undefined
                    ? { clase: CLASE_PATENTE, min: filtros.confianzaMin, max: filtros.confianzaMax }
                    : undefined
                }
              />
              <Stack sx={{ mt: 2.5, alignItems: "center" }}>
                {cargandoImagenes && <CircularProgress size={20} />}
              </Stack>
            </Box>
          </UkoSectionCard>
        </Stack>
      </Box>
    </Stack>
  );
}
