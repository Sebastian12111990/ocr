import { useEffect, useState } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { CheckCircleOutlined } from "@mui/icons-material";

import { UkoAlert } from "@/shared/componentes/feedback";
import { ModalNoIncluidasPorConfianza } from "./ModalNoIncluidasPorConfianza";
import {
  useAceptarPorConfianzaMutation,
  useLazyPrevisualizarAceptarPorConfianzaQuery,
  useListarImagenesDatasetQuery,
} from "../datasetApi";
import type { TipoEtiquetaResumen } from "../dataset.types";

interface Props {
  clase: string;
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  confianzaMin: number | null;
  confianzaMax: number | null;
  tiposEtiqueta: TipoEtiquetaResumen[];
  /** Se llama después de aplicar con éxito — el padre recarga la galería desde cero. */
  onAplicado: () => void;
}

/** Acepta en masa ('correcta') las cajas pendientes con confianza >= umbral, sin revisarlas una
 * por una. Antes de aplicar, muestra la tasa de acierto ESTIMADA a partir de cajas del mismo
 * rango que un humano ya revisó — no hay garantía, por eso el paso de previsualizar es
 * obligatorio (el botón de aplicar no existe hasta que se previsualiza el umbral actual). */
export function PanelAceptarPorConfianza({
  clase,
  planta,
  fechaDesde,
  fechaHasta,
  confianzaMin,
  confianzaMax,
  tiposEtiqueta,
  onAplicado,
}: Props) {
  const [previsualizar, { data: previsualizacion, isFetching: cargandoPrevisualizacion, error: errorPrevisualizacion }] =
    useLazyPrevisualizarAceptarPorConfianzaQuery();
  const [aceptar, { isLoading: aplicando, error: errorAplicar }] = useAceptarPorConfianzaMutation();
  const [resultado, setResultado] = useState<number | null>(null);
  const [verExcluidas, setVerExcluidas] = useState(false);
  // Filtros con los que se pidió la última previsualización — si no coinciden con los filtros
  // actuales, ese número quedó viejo y no hay que dejarlo aplicar: "Aplicar" siempre debe usar el
  // mismo conjunto de filtros que generó el conteo que el usuario ve en pantalla, nunca uno más
  // nuevo (eso fue justo lo que causó aplicar sobre 0 candidatos con un número viejo visible).
  const [clavePrevisualizada, setClavePrevisualizada] = useState<string | null>(null);

  // La previsualización anterior queda obsoleta apenas cambia cualquier filtro — se oculta hasta
  // que se pida una nueva, para no mostrar un acierto estimado que ya no corresponde al umbral actual.
  useEffect(() => {
    setResultado(null);
  }, [clase, planta, fechaDesde, fechaHasta, confianzaMin, confianzaMax]);

  // Cuenta en vivo (no una previsualización que hay que pedir a mano) de "¿Cuáles no van?" — el
  // número final después de aplicar Descartar por forma/tamaño relativo sobre ese mismo lote de baja
  // confianza. `limite: 1` porque acá solo interesa `total`, no traer las imágenes. Se re-consulta
  // sola cuando cualquier bulk-write invalida la tag "ImagenDataset"/"LISTA" (aceptar, descartar,
  // reprocesar), así que no queda desactualizada tras esos cambios.
  const { data: excluidasPagina } = useListarImagenesDatasetQuery(
    {
      vista: "todas",
      planta: planta || undefined,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      confianzaMax: confianzaMin ?? undefined,
      confianzaClase: clase,
      limite: 1,
    },
    { skip: confianzaMin === null },
  );

  if (confianzaMin === null) return null;

  const filtrosActuales = () => ({
    clase,
    confianzaMin,
    confianzaMax: confianzaMax ?? undefined,
    planta: planta || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  });

  const claveFiltrosActuales = JSON.stringify(filtrosActuales());
  const previsualizacionVigente = previsualizacion && clavePrevisualizada === claveFiltrosActuales ? previsualizacion : null;

  const alPrevisualizar = () => {
    setClavePrevisualizada(claveFiltrosActuales);
    void previsualizar(filtrosActuales());
  };

  const alAplicar = async () => {
    const resultadoAplicar = await aceptar(filtrosActuales()).unwrap();
    setResultado(resultadoAplicar.actualizadas);
    onAplicado();
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0, height: "100%", borderRadius: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Aceptar por confianza
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Marca como correctas las cajas dentro del rango seleccionado.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          disabled={cargandoPrevisualizacion}
          onClick={alPrevisualizar}
          sx={{ flexShrink: 0 }}
        >
          Previsualizar cajas
        </Button>
      </Stack>

      {errorPrevisualizacion && (
        <UkoAlert severity="error" title="No se pudo previsualizar" sx={{ mt: 1 }}>
          No se pudo previsualizar.
        </UkoAlert>
      )}
      {/* Si cambiaste algún filtro después de previsualizar, ese número quedó viejo — se oculta
          hasta que vuelvas a previsualizar con los filtros actuales, para nunca aplicar "a ciegas"
          sobre un conteo que ya no corresponde. */}
      {previsualizacion && !previsualizacionVigente && resultado === null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Cambiaste el filtro después de previsualizar — volvé a previsualizar para ver el conteo actual.
        </Typography>
      )}
      {previsualizacionVigente && resultado === null && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="body2">
            <strong>{previsualizacionVigente.candidatos.toLocaleString("es-CL")}</strong> cajas pendientes en este rango.
          </Typography>
          {previsualizacionVigente.tasaAciertoEstimada === null ? (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              No hay cajas ya revisadas en este rango para estimar una tasa de acierto — cuidado al aplicar a ciegas.
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              De {previsualizacionVigente.revisadasEnRango} cajas ya revisadas en este mismo rango,{" "}
              {previsualizacionVigente.correctasEnRango} eran correctas —{" "}
              <strong>{(previsualizacionVigente.tasaAciertoEstimada * 100).toFixed(1)}% de acierto estimado</strong>.
            </Typography>
          )}
          <Stack direction="row" spacing={1.5} sx={{ mt: 1, alignItems: "center" }}>
            <Button
              variant="contained"
              color="success"
              size="small"
              endIcon={<CheckCircleOutlined />}
              disabled={aplicando || previsualizacionVigente.candidatos === 0}
              onClick={() => void alAplicar()}
            >
              Aceptar {previsualizacionVigente.candidatos.toLocaleString("es-CL")}
            </Button>
            <Button size="small" onClick={() => setVerExcluidas(true)}>
              ¿Cuáles no van ({(excluidasPagina?.total ?? 0).toLocaleString("es-CL")})?
            </Button>
            {aplicando && <Typography variant="caption">Aplicando…</Typography>}
          </Stack>
        </Box>
      )}
      {errorAplicar && (
        <UkoAlert severity="error" title="No se pudo aplicar" sx={{ mt: 1 }}>
          No se pudo aplicar.
        </UkoAlert>
      )}
      {resultado !== null && (
        <UkoAlert severity="success" title="Cambios aplicados" sx={{ mt: 1 }}>
          {resultado.toLocaleString("es-CL")} cajas marcadas como correctas.
        </UkoAlert>
      )}

      <ModalNoIncluidasPorConfianza
        open={verExcluidas}
        onClose={() => setVerExcluidas(false)}
        clase={clase}
        planta={planta}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        confianzaMin={confianzaMin}
        confianzaMax={confianzaMax}
        tiposEtiqueta={tiposEtiqueta}
      />
    </Paper>
  );
}
