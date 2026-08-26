import { Box, Button, Card, CardMedia, Chip, Stack, Typography } from "@mui/material";

import type { Pipeline } from "@/features/editor/pipeline.types";
import { extraerMensajeError } from "@/shared/utils/errores";
import { useObtenerCandidatosMutation } from "../candidatosApi";

interface Props {
  imagenId: string | null;
  pipeline: Pipeline;
}

function etiquetaTexto(texto: string | null): string {
  if (texto === null) return "OCR no disponible";
  if (texto === "") return "Sin texto detectado";
  return texto;
}

/** Recorta las regiones rectangulares detectadas sobre la imagen ya procesada
 * (misma lógica que la etapa "Rectángulos") y corre OCR sobre cada una por
 * separado, para no depender de un único texto sobre la foto completa. */
export function PanelCandidatos({ imagenId, pipeline }: Props) {
  const [obtenerCandidatos, { data, isLoading, error }] = useObtenerCandidatosMutation();
  const candidatos = data?.candidatos ?? [];

  async function alObtener(): Promise<void> {
    if (!imagenId) return;
    try {
      await obtenerCandidatos({ imagenId, pipeline }).unwrap();
    } catch {
      // el error queda expuesto por RTK Query en `error`, se muestra abajo
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

      {data && candidatos.length === 0 && !error && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No se encontró ninguna región que parezca una patente con los ajustes actuales.
        </Typography>
      )}

      {candidatos.length > 0 && (
        <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1 }}>
          {candidatos.map((candidato, indice) => (
            <Card key={indice} variant="outlined" sx={{ minWidth: 180, flexShrink: 0 }}>
              {candidato.imagenPngBase64 && (
                <CardMedia
                  component="img"
                  image={`data:image/png;base64,${candidato.imagenPngBase64}`}
                  alt={`Candidato ${indice + 1}`}
                  sx={{ height: 60, objectFit: "contain", bgcolor: "common.black" }}
                />
              )}
              <Stack spacing={0.5} sx={{ p: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {etiquetaTexto(candidato.texto)}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
                  {candidato.confianza !== null && (
                    <Chip size="small" label={`${candidato.confianza.toFixed(0)}%`} />
                  )}
                  <Chip
                    size="small"
                    label={`${Math.round(candidato.caja.ancho)}×${Math.round(candidato.caja.alto)}`}
                  />
                </Stack>
              </Stack>
            </Card>
          ))}
        </Box>
      )}
    </Stack>
  );
}
