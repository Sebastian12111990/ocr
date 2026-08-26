import { useEffect, useRef, useState } from "react";
import { Alert, Button, Chip, Stack, Typography } from "@mui/material";

import type { Candidato } from "@/features/candidatos/candidatos.types";
import type { Pipeline } from "@/features/editor/pipeline.types";
import { blobABase64 } from "@/shared/utils/base64";
import { extraerMensajeError } from "@/shared/utils/errores";
import { useEjecutarOcrMutation, useGuardarEjecucionMutation } from "../resultadosApi";
import type { ResultadoGuardarEjecucion, ResultadoOcrManual } from "../resultados.types";

interface Props {
  imagenId: string | null;
  pipeline: Pipeline;
  contextoActual: string | null;
  resultado: ResultadoOcrManual | null;
  candidatos: Candidato[] | null;
  imagenProcesada: Blob | null;
  esEjecucionHistorica: boolean;
  onIniciarOcr: () => void;
  onOcrEjecutado: (contexto: string, resultado: ResultadoOcrManual) => void;
}

interface ConfirmacionGuardado {
  contexto: string;
  resultado: ResultadoGuardarEjecucion;
}

interface FalloGuardado {
  contexto: string;
  mensaje: string;
}

function obtenerMotivoBloqueo(
  imagenId: string | null,
  resultado: ResultadoOcrManual | null,
  candidatos: Candidato[] | null,
  imagenProcesada: Blob | null,
  esEjecucionHistorica: boolean,
): string | null {
  if (!imagenId) return "selecciona una patente";
  if (esEjecucionHistorica) return "la ejecución cargada es histórica e inmutable";
  if (!resultado) return "ejecuta OCR con la configuración actual";
  if (candidatos === null) return "obtén los candidatos con la configuración actual";

  const candidatosValidos = candidatos.filter((candidato) => (candidato.coincidencia ?? 0) >= 20);
  if (candidatosValidos.length === 0) {
    return "se necesita al menos un candidato con coincidencia igual o superior al 20%";
  }
  if (candidatosValidos.some((candidato) => !candidato.imagenPngBase64)) {
    return "todos los candidatos válidos deben incluir su recorte PNG";
  }
  if (!imagenProcesada || imagenProcesada.size === 0) return "espera que termine la vista procesada";
  return null;
}

export function PanelResultados({
  imagenId,
  pipeline,
  contextoActual,
  resultado,
  candidatos,
  imagenProcesada,
  esEjecucionHistorica,
  onIniciarOcr,
  onOcrEjecutado,
}: Props) {
  const [ejecutarOcr, { isLoading: ejecutandoOcr, error: errorOcr, reset: resetOcr }] = useEjecutarOcrMutation();
  const [guardarEjecucion, { isLoading: enviandoGuardado }] = useGuardarEjecucionMutation();
  const [preparandoGuardado, setPreparandoGuardado] = useState(false);
  const [confirmacion, setConfirmacion] = useState<ConfirmacionGuardado | null>(null);
  const [falloGuardado, setFalloGuardado] = useState<FalloGuardado | null>(null);
  const solicitudOcrRef = useRef<{ abort: () => void } | null>(null);
  const guardadoEnCursoRef = useRef(false);
  const contextoActualRef = useRef(contextoActual);
  contextoActualRef.current = contextoActual;

  const motivoBloqueo = obtenerMotivoBloqueo(
    imagenId,
    resultado,
    candidatos,
    imagenProcesada,
    esEjecucionHistorica,
  );
  const guardando = preparandoGuardado || enviandoGuardado;
  const confirmacionVisible = confirmacion?.contexto === contextoActual ? confirmacion.resultado : null;
  const falloVisible = falloGuardado?.contexto === contextoActual ? falloGuardado.mensaje : null;

  useEffect(() => {
    solicitudOcrRef.current?.abort();
    solicitudOcrRef.current = null;
    resetOcr();
    setConfirmacion(null);
    setFalloGuardado(null);
    return () => solicitudOcrRef.current?.abort();
  }, [contextoActual, resetOcr]);

  async function alEjecutar(): Promise<void> {
    if (!imagenId || !contextoActual) return;
    resetOcr();
    onIniciarOcr();
    const solicitud = ejecutarOcr({ imagenId, pipeline });
    solicitudOcrRef.current = solicitud;
    try {
      const respuesta = await solicitud.unwrap();
      if (solicitudOcrRef.current !== solicitud) return;
      onOcrEjecutado(contextoActual, respuesta);
    } catch {
      // El error de RTK Query se muestra en el panel.
    } finally {
      if (solicitudOcrRef.current === solicitud) solicitudOcrRef.current = null;
    }
  }

  async function alGuardarEjecucion(): Promise<void> {
    if (
      guardadoEnCursoRef.current
      || motivoBloqueo
      || !imagenId
      || !contextoActual
      || !resultado
      || candidatos === null
      || !imagenProcesada
    ) return;

    const contextoGuardado = contextoActual;
    guardadoEnCursoRef.current = true;
    setPreparandoGuardado(true);
    setConfirmacion(null);
    setFalloGuardado(null);

    try {
      const imagenProcesadaPngBase64 = await blobABase64(imagenProcesada);
      if (contextoActualRef.current !== contextoGuardado) return;

      const respuesta = await guardarEjecucion({
        imagenId,
        pipeline,
        resultadoOcr: {
          textoDetectado: resultado.textoDetectado,
          confianza: resultado.confianza,
          duracionMs: resultado.duracionMs,
        },
        imagenProcesadaPngBase64,
        // La lista completa conserva el índice original. La API recalcula y
        // persiste únicamente los candidatos cuya coincidencia sea ≥20%.
        candidatos: candidatos.map((candidato) => ({
          caja: candidato.caja,
          area: candidato.area,
          texto: candidato.texto,
          confianza: candidato.confianza,
          coincidencia: candidato.coincidencia,
          imagenPngBase64: candidato.imagenPngBase64,
        })),
      }).unwrap();

      if (contextoActualRef.current === contextoGuardado) {
        setConfirmacion({ contexto: contextoGuardado, resultado: respuesta });
      }
    } catch (error: unknown) {
      if (contextoActualRef.current === contextoGuardado) {
        setFalloGuardado({ contexto: contextoGuardado, mensaje: extraerMensajeError(error) });
      }
    } finally {
      guardadoEnCursoRef.current = false;
      setPreparandoGuardado(false);
    }
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Button variant="contained" onClick={alEjecutar} disabled={!imagenId || ejecutandoOcr}>
        {ejecutandoOcr ? "Ejecutando OCR…" : "Ejecutar OCR"}
      </Button>

      {errorOcr && <Alert severity="error">{extraerMensajeError(errorOcr)}</Alert>}

      {resultado && (
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Texto detectado
          </Typography>
          <Typography variant="h5">{resultado.textoDetectado || "(vacío)"}</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip
              size="small"
              color={resultado.acierto ? "success" : "default"}
              label={resultado.acierto ? "Acierto" : "Sin acierto"}
            />
            {resultado.distanciaEdicion !== null && (
              <Chip size="small" label={`Distancia: ${resultado.distanciaEdicion}`} />
            )}
            {resultado.confianza !== null && (
              <Chip size="small" label={`Confianza: ${resultado.confianza.toFixed(1)}%`} />
            )}
          </Stack>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Esperado: {resultado.imagen.patenteEsperada ?? "—"} · {resultado.duracionMs} ms
          </Typography>
        </Stack>
      )}

      {confirmacionVisible && (
        <Alert severity="success">
          Ejecución guardada: {confirmacionVisible.candidatosGuardados} candidato(s), mejor coincidencia{" "}
          {confirmacionVisible.mejorCoincidencia.toFixed(0)}%.
        </Alert>
      )}
      {falloVisible && <Alert severity="error">{falloVisible}</Alert>}

      <Button
        color="success"
        variant="contained"
        onClick={alGuardarEjecucion}
        disabled={motivoBloqueo !== null || guardando}
        fullWidth
      >
        {guardando ? "Guardando ejecución…" : "Guardar ejecución"}
      </Button>
      {motivoBloqueo && !guardando && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Para guardar: {motivoBloqueo}.
        </Typography>
      )}
    </Stack>
  );
}
