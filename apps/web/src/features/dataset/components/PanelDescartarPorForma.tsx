import { useEffect, useState } from "react";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";

import { UkoAlert } from "@/shared/componentes/feedback";
import { ModalCandidatasDescartarPorForma } from "./ModalCandidatasDescartarPorForma";
import { useDescartarPorFormaMutation, useLazyPrevisualizarDescartarPorFormaQuery } from "../datasetApi";
import { CLASE_PATENTE } from "../dataset.types";
import type { TipoEtiquetaResumen } from "../dataset.types";

interface Props {
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  /** Mismo umbral que "Confianza mín. %" / "Aceptar por confianza": este panel es la limpieza de
   * las cajas que quedan AFUERA de ese umbral ("¿Cuáles no van?"), no un heurístico independiente
   * — así no puede volver a pasar lo de forma-rara-pero-confianza-alta (0.80-0.83) que resultó ser
   * una patente real con la caja mal regresionada. */
  confianzaMax: number | undefined;
  tiposEtiqueta: TipoEtiquetaResumen[];
  /** Se llama después de aplicar con éxito — el padre recarga la galería desde cero. */
  onAplicado: () => void;
}

const RELACION_MIN_POR_DEFECTO = "0.8";
const RELACION_MAX_POR_DEFECTO = "2.5";

/** Descarta en bloque ('falso_positivo') las cajas de patente que quedaron "afuera" del umbral de
 * "Aceptar por confianza" (ver ¿Cuáles no van?) y además tienen una relación ancho/alto físicamente
 * imposible: una patente vista de frente siempre es más ancha que alta. Sirve para limpiar errores
 * groseros del modelo (cajas casi cuadradas o que cubren media imagen) dentro de ese lote de baja
 * confianza sin tener que abrirlas una por una — mismo patrón previsualizar-antes-de-aplicar que
 * "aceptar por confianza", con el mismo motivo: no hay garantía de que el rango elegido sea perfecto. */
export function PanelDescartarPorForma({ planta, fechaDesde, fechaHasta, confianzaMax, tiposEtiqueta, onAplicado }: Props) {
  const [relacionMin, setRelacionMin] = useState(RELACION_MIN_POR_DEFECTO);
  const [relacionMax, setRelacionMax] = useState(RELACION_MAX_POR_DEFECTO);
  const [verCandidatas, setVerCandidatas] = useState(false);
  const [previsualizar, { data: previsualizacion, isFetching: cargandoPrevisualizacion, error: errorPrevisualizacion }] =
    useLazyPrevisualizarDescartarPorFormaQuery();
  const [descartar, { isLoading: aplicando, error: errorAplicar }] = useDescartarPorFormaMutation();
  const [resultado, setResultado] = useState<number | null>(null);
  // Filtros con los que se pidió la última previsualización — si no coinciden con los actuales, el
  // número en pantalla quedó viejo y no hay que dejarlo aplicar a ciegas (ver PanelAceptarPorConfianza).
  const [clavePrevisualizada, setClavePrevisualizada] = useState<string | null>(null);

  useEffect(() => {
    setResultado(null);
  }, [planta, fechaDesde, fechaHasta, relacionMin, relacionMax, confianzaMax]);

  const relacionMinNum = Number(relacionMin);
  const relacionMaxNum = Number(relacionMax);
  const rangoValido =
    relacionMin !== "" && relacionMax !== "" && relacionMinNum >= 0 && relacionMaxNum > relacionMinNum;

  const filtrosActuales = () => ({
    clase: CLASE_PATENTE,
    relacionMin: relacionMinNum,
    relacionMax: relacionMaxNum,
    confianzaMax,
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
    const resultadoAplicar = await descartar(filtrosActuales()).unwrap();
    setResultado(resultadoAplicar.actualizadas);
    onAplicado();
  };

  if (confianzaMax === undefined) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0, height: "100%", borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Descartar por forma
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Es la limpieza de "¿Cuáles no van?" — definí "Confianza mín. %" arriba para habilitarlo.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0, height: "100%", borderRadius: 2 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        Descartar por forma
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Limpieza de "¿Cuáles no van?": de las cajas con confianza por debajo de{" "}
        {(confianzaMax * 100).toFixed(0)}%, marca como falso positivo las que además tengan una
        proporción ancho/alto imposible.
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <TextField
          size="small"
          type="number"
          label="Relación mín."
          value={relacionMin}
          onChange={(evento) => setRelacionMin(evento.target.value)}
          slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
          sx={{ width: 120 }}
        />
        <TextField
          size="small"
          type="number"
          label="Relación máx."
          value={relacionMax}
          onChange={(evento) => setRelacionMax(evento.target.value)}
          slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
          sx={{ width: 120 }}
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
            <strong>{previsualizacionVigente.candidatos.toLocaleString("es-CL")}</strong> cajas pendientes con esa forma
            (fuera de {relacionMin}–{relacionMax}, ancho/alto) y confianza ≤ {(confianzaMax * 100).toFixed(0)}%.
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ mt: 1, alignItems: "center" }}>
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

      <ModalCandidatasDescartarPorForma
        open={verCandidatas}
        onClose={() => setVerCandidatas(false)}
        clase={CLASE_PATENTE}
        relacionMin={relacionMinNum}
        relacionMax={relacionMaxNum}
        confianzaMax={confianzaMax}
        planta={planta}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        tiposEtiqueta={tiposEtiqueta}
      />
    </Paper>
  );
}
