import { useEffect, useState } from "react";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";

import { UkoAlert } from "@/shared/componentes/feedback";
import { ModalCandidatasDescartarPorTamanoRelativo } from "./ModalCandidatasDescartarPorTamanoRelativo";
import { ModalNoIncluidasPorTamanoRelativo } from "./ModalNoIncluidasPorTamanoRelativo";
import {
  useDescartarPorTamanoRelativoMutation,
  useLazyPrevisualizarDescartarPorTamanoRelativoQuery,
  useObtenerEstadisticasTamanoQuery,
  usePrevisualizarNoIncluidasPorTamanoRelativoQuery,
} from "../datasetApi";
import { CLASE_PATENTE } from "../dataset.types";
import type { TipoEtiquetaResumen } from "../dataset.types";

interface Props {
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  tiposEtiqueta: TipoEtiquetaResumen[];
  /** Se llama después de aplicar con éxito — el padre recarga la galería desde cero. */
  onAplicado: () => void;
}

// Verificado en la práctica: cuando el modelo detecta 2 patentes en la misma imagen, la chica
// suele ser ruido (reflejo en un vidrio, franja de otro vehículo) y no compite en tamaño con la
// real — 40% del área de la mayor separa bien los casos vistos.
const RELACION_MAXIMA_POR_DEFECTO = "0.4";

/** Descarta en bloque ('falso_positivo') las cajas de patente pendientes cuya área es mucho menor
 * a la mayor caja de patente de su MISMA imagen — no toca imágenes con una sola detección, donde
 * una caja chica puede ser legítima. Mismo patrón previsualizar-antes-de-aplicar que "Descartar
 * por forma". */
export function PanelDescartarPorTamanoRelativo({ planta, fechaDesde, fechaHasta, tiposEtiqueta, onAplicado }: Props) {
  const [relacionMaxima, setRelacionMaxima] = useState(RELACION_MAXIMA_POR_DEFECTO);
  const [anchoMaximoPx, setAnchoMaximoPx] = useState("");
  const [altoMaximoPx, setAltoMaximoPx] = useState("");
  const [verCandidatas, setVerCandidatas] = useState(false);
  const [verNoIncluidas, setVerNoIncluidas] = useState(false);
  const [
    previsualizar,
    { data: previsualizacion, isFetching: cargandoPrevisualizacion, error: errorPrevisualizacion },
  ] = useLazyPrevisualizarDescartarPorTamanoRelativoQuery();
  const [descartar, { isLoading: aplicando, error: errorAplicar }] = useDescartarPorTamanoRelativoMutation();
  const [resultado, setResultado] = useState<number | null>(null);
  // Referencia real (no a ojo) para calibrar los umbrales en px: ancho/alto de las cajas ya
  // confirmadas 'correcta' en este mismo filtro — se re-consulta sola con las demás (misma tag
  // "ResumenDataset" que ya invalidan todos los bulk-write).
  const { data: estadisticas } = useObtenerEstadisticasTamanoQuery({
    clase: CLASE_PATENTE,
    planta: planta || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  });
  // Filtros con los que se pidió la última previsualización — si no coinciden con los actuales, el
  // número en pantalla quedó viejo y no hay que dejarlo aplicar a ciegas (ver PanelAceptarPorConfianza).
  const [clavePrevisualizada, setClavePrevisualizada] = useState<string | null>(null);

  useEffect(() => {
    setResultado(null);
  }, [planta, fechaDesde, fechaHasta, relacionMaxima, anchoMaximoPx, altoMaximoPx]);

  const relacionMaximaNum = Number(relacionMaxima);
  const anchoMaximoPxNum = anchoMaximoPx === "" ? undefined : Number(anchoMaximoPx);
  const altoMaximoPxNum = altoMaximoPx === "" ? undefined : Number(altoMaximoPx);
  const rangoValido =
    relacionMaxima !== "" &&
    relacionMaximaNum > 0 &&
    relacionMaximaNum < 1 &&
    (anchoMaximoPxNum === undefined || anchoMaximoPxNum > 0) &&
    (altoMaximoPxNum === undefined || altoMaximoPxNum > 0);

  const filtrosActuales = () => ({
    clase: CLASE_PATENTE,
    relacionMaxima: relacionMaximaNum,
    anchoMaximoPx: anchoMaximoPxNum,
    altoMaximoPx: altoMaximoPxNum,
    planta: planta || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  });

  const claveFiltrosActuales = JSON.stringify(filtrosActuales());
  const previsualizacionVigente = previsualizacion && clavePrevisualizada === claveFiltrosActuales ? previsualizacion : null;

  // Cuenta en vivo (no una previsualización manual) de la "zona gris": cajas que compiten con otra
  // de su imagen pero el umbral actual no agarra — se re-consulta sola con cualquier cambio de
  // filtro o bulk-write (misma tag "ResumenDataset"), mismo patrón que "¿Cuáles no van?".
  const { data: noIncluidas } = usePrevisualizarNoIncluidasPorTamanoRelativoQuery(filtrosActuales(), {
    skip: !rangoValido,
  });

  const alPrevisualizar = () => {
    setClavePrevisualizada(claveFiltrosActuales);
    void previsualizar(filtrosActuales());
  };

  const alAplicar = async () => {
    const resultadoAplicar = await descartar(filtrosActuales()).unwrap();
    setResultado(resultadoAplicar.actualizadas);
    onAplicado();
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0, height: "100%", borderRadius: 2 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        Descartar por tamaño relativo
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Marca como falso positivo la caja de patente mucho más chica que otra de la misma imagen.
      </Typography>

      {estadisticas && estadisticas.ancho && estadisticas.alto && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          Patentes ya confirmadas ({estadisticas.muestras.toLocaleString("es-CL")}): ancho{" "}
          {estadisticas.ancho.promedio}px prom. ({estadisticas.ancho.min}–{estadisticas.ancho.max}px) · alto{" "}
          {estadisticas.alto.promedio}px prom. ({estadisticas.alto.min}–{estadisticas.alto.max}px)
        </Typography>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <TextField
          size="small"
          type="number"
          label="Área máx. relativa"
          title="La caja se marca sospechosa si su área es menor a esta fracción del área de la mayor detección de patente en la misma imagen."
          value={relacionMaxima}
          onChange={(evento) => setRelacionMaxima(evento.target.value)}
          slotProps={{ htmlInput: { min: 0, max: 1, step: 0.05 } }}
          sx={{ width: 150 }}
        />
        <TextField
          size="small"
          type="number"
          label="Ancho máx. (px)"
          title="Opcional — además de la relativa, la caja solo es candidata si su ancho en píxeles reales no supera esto."
          value={anchoMaximoPx}
          onChange={(evento) => setAnchoMaximoPx(evento.target.value)}
          slotProps={{ htmlInput: { min: 1, step: 1 } }}
          sx={{ width: 140 }}
        />
        <TextField
          size="small"
          type="number"
          label="Alto máx. (px)"
          title="Opcional — además de la relativa, la caja solo es candidata si su alto en píxeles reales no supera esto."
          value={altoMaximoPx}
          onChange={(evento) => setAltoMaximoPx(evento.target.value)}
          slotProps={{ htmlInput: { min: 1, step: 1 } }}
          sx={{ width: 140 }}
        />
        <Button
          variant="outlined"
          size="small"
          disabled={!rangoValido || cargandoPrevisualizacion}
          onClick={alPrevisualizar}
        >
          Previsualizar cajas
        </Button>
      </Stack>

      {/* Siempre visible (no depende de "Previsualizar"): revisión manual disponible de entrada,
          antes que cualquier acción en bloque — con pocas imágenes conviene resolverlas a mano. */}
      {rangoValido && (
        <Button size="small" sx={{ mt: 1 }} onClick={() => setVerNoIncluidas(true)}>
          ¿Cuáles se quedan ({(noIncluidas?.candidatos ?? 0).toLocaleString("es-CL")})?
        </Button>
      )}

      {errorPrevisualizacion && (
        <UkoAlert severity="error" title="No se pudo previsualizar" sx={{ mt: 1 }}>
          No se pudo previsualizar.
        </UkoAlert>
      )}
      {previsualizacion && !previsualizacionVigente && resultado === null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Cambiaste el filtro después de previsualizar — volvé a previsualizar para ver el conteo actual.
        </Typography>
      )}
      {previsualizacionVigente && resultado === null && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="body2">
            <strong>{previsualizacionVigente.candidatos.toLocaleString("es-CL")}</strong> cajas pendientes con área menor
            al {(relacionMaximaNum * 100).toFixed(0)}% de la mayor detección de patente de su misma imagen
            {(anchoMaximoPxNum !== undefined || altoMaximoPxNum !== undefined) &&
              ` y tamaño en píxeles hasta ${anchoMaximoPxNum ?? "∞"}×${altoMaximoPxNum ?? "∞"}px`}
            .
          </Typography>
          {/* Revisión manual primero ("Ver imágenes"): con pocas cajas conviene resolverlas una
              por una en vez de confiar en el bulk-write — ese queda al final, como último
              recurso cuando el volumen ya no da para revisar a mano. */}
          <Stack direction="row" spacing={1.5} sx={{ mt: 1, alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              disabled={previsualizacionVigente.candidatos === 0}
              onClick={() => setVerCandidatas(true)}
            >
              Ver imágenes
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              disabled={aplicando || previsualizacionVigente.candidatos === 0}
              onClick={() => void alAplicar()}
            >
              Descartar {previsualizacionVigente.candidatos.toLocaleString("es-CL")} como falso positivo
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
          {resultado.toLocaleString("es-CL")} cajas marcadas como falso positivo.
        </UkoAlert>
      )}

      <ModalCandidatasDescartarPorTamanoRelativo
        open={verCandidatas}
        onClose={() => setVerCandidatas(false)}
        clase={CLASE_PATENTE}
        relacionMaxima={relacionMaximaNum}
        anchoMaximoPx={anchoMaximoPxNum}
        altoMaximoPx={altoMaximoPxNum}
        planta={planta}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        tiposEtiqueta={tiposEtiqueta}
      />
      <ModalNoIncluidasPorTamanoRelativo
        open={verNoIncluidas}
        onClose={() => setVerNoIncluidas(false)}
        clase={CLASE_PATENTE}
        relacionMaxima={relacionMaximaNum}
        anchoMaximoPx={anchoMaximoPxNum}
        altoMaximoPx={altoMaximoPxNum}
        planta={planta}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        tiposEtiqueta={tiposEtiqueta}
      />
    </Paper>
  );
}
