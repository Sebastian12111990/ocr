import { Box, Button, Card, CardMedia, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useRef } from "react";

import type { Pipeline } from "@/features/editor/pipeline.types";
import { extraerMensajeError } from "@/shared/utils/errores";
import { useObtenerCandidatosMutation } from "../candidatosApi";
import type { Candidato } from "../candidatos.types";

interface Props {
  imagenId: string | null;
  pipeline: Pipeline;
  contextoActual: string | null;
  candidatos: Candidato[] | null;
  onIniciarBusqueda: () => void;
  onCandidatosObtenidos: (contexto: string, candidatos: Candidato[]) => void;
}

function etiquetaTexto(texto: string | null): string {
  if (texto === null) return "OCR no disponible";
  if (texto === "") return "Sin texto detectado";
  return texto;
}

function estiloCoincidencia(coincidencia: number | null) {
  if (coincidencia === 100) {
    return { borde: "success.main", fondo: "rgba(46, 125, 50, 0.18)", color: "success" as const };
  }
  if (coincidencia !== null && coincidencia >= 60) {
    return { borde: "warning.main", fondo: "rgba(237, 108, 2, 0.16)", color: "warning" as const };
  }
  return { borde: "grey.600", fondo: "rgba(158, 158, 158, 0.12)", color: "default" as const };
}

/** Recorta las regiones rectangulares detectadas sobre la imagen ya procesada
 * (misma lógica que la etapa "Rectángulos") y corre OCR sobre cada una por
 * separado, para no depender de un único texto sobre la foto completa. */
export function PanelCandidatos({
  imagenId,
  pipeline,
  contextoActual,
  candidatos,
  onIniciarBusqueda,
  onCandidatosObtenidos,
}: Props) {
  const [obtenerCandidatos, { isLoading, error, reset }] = useObtenerCandidatosMutation();
  const solicitudEnCursoRef = useRef<{ abort: () => void } | null>(null);
  const listaCandidatos = candidatos ?? [];

  useEffect(() => {
    solicitudEnCursoRef.current?.abort();
    solicitudEnCursoRef.current = null;
    reset();
    return () => solicitudEnCursoRef.current?.abort();
  }, [contextoActual, reset]);

  async function alObtener(): Promise<void> {
    if (!imagenId || !contextoActual) return;
    reset();
    onIniciarBusqueda();
    const solicitud = obtenerCandidatos({ imagenId, pipeline });
    solicitudEnCursoRef.current = solicitud;
    try {
      const respuesta = await solicitud.unwrap();
      if (solicitudEnCursoRef.current !== solicitud) return;
      onCandidatosObtenidos(contextoActual, respuesta.candidatos);
    } catch {
      // el error queda expuesto por RTK Query en `error`, se muestra abajo
    } finally {
      if (solicitudEnCursoRef.current === solicitud) solicitudEnCursoRef.current = null;
    }
  }

  return (
    <Stack spacing={1.5} sx={{ p: 2 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle2">Candidatos a patente</Typography>
        <Button size="small" variant="outlined" onClick={alObtener} disabled={!imagenId || isLoading}>
          {isLoading ? "Buscando…" : "Obtener candidatos"}
        </Button>
      </Stack>

      {error && (
        <Typography variant="body2" sx={{ color: "error.main" }}>
          {extraerMensajeError(error)}
        </Typography>
      )}

      {candidatos !== null && listaCandidatos.length === 0 && !error && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No se encontró ninguna región que parezca una patente con los ajustes actuales.
        </Typography>
      )}

      {listaCandidatos.length > 0 && (
        <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1 }}>
          {listaCandidatos.map((candidato, indice) => {
            const estilo = estiloCoincidencia(candidato.coincidencia);
            return (
            <Card
              key={indice}
              variant="outlined"
              sx={{ minWidth: 180, flexShrink: 0, borderWidth: 2, borderColor: estilo.borde, bgcolor: estilo.fondo }}
            >
              {candidato.imagenPngBase64 && (
                <CardMedia
                  component="img"
                  image={`data:image/png;base64,${candidato.imagenPngBase64}`}
                  alt={`Candidato ${indice + 1}`}
                  sx={{ height: 60, objectFit: "contain", bgcolor: "common.black" }}
                />
              )}
              <Stack spacing={0.5} sx={{ p: 1 }}>
                <Tooltip title="Texto reconocido por Tesseract en este candidato">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {etiquetaTexto(candidato.texto)}
                  </Typography>
                </Tooltip>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
                  {candidato.coincidencia !== null && (
                    <Tooltip title={`Coincidencia con la patente esperada ${candidato.patenteEsperada ?? ""}`}>
                      <Chip
                        size="small"
                        color={estilo.color}
                        label={`${candidato.coincidencia.toFixed(0)}% coincidencia`}
                      />
                    </Tooltip>
                  )}
                  {candidato.confianza !== null && (
                    <Tooltip title="Confianza estimada del reconocimiento OCR">
                      <Chip size="small" label={`${candidato.confianza.toFixed(0)}%`} />
                    </Tooltip>
                  )}
                  <Tooltip title="Ancho × alto del recorte detectado, en píxeles">
                    <Chip
                      size="small"
                      label={`${Math.round(candidato.caja.ancho)}×${Math.round(candidato.caja.alto)}`}
                    />
                  </Tooltip>
                </Stack>
              </Stack>
            </Card>
            );
          })}
        </Box>
      )}
    </Stack>
  );
}
