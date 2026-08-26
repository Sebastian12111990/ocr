import { useState } from "react";
import { Alert, Button, Chip, Stack, TextField, Typography } from "@mui/material";

import type { Pipeline } from "@/features/editor/pipeline.types";
import { extraerMensajeError } from "@/shared/utils/errores";
import { useCrearPresetMutation, useEjecutarOcrMutation } from "../resultadosApi";

interface Props {
  imagenId: string | null;
  pipeline: Pipeline;
}

export function PanelResultados({ imagenId, pipeline }: Props) {
  const [ejecutarOcr, { data: resultado, isLoading, error }] = useEjecutarOcrMutation();
  const [crearPreset, { isLoading: guardando }] = useCrearPresetMutation();
  const [nombrePreset, setNombrePreset] = useState("");

  async function alEjecutar(): Promise<void> {
    if (!imagenId) return;
    try {
      await ejecutarOcr({ imagenId, pipeline }).unwrap();
    } catch {
      // el error queda expuesto por RTK Query en `error`, se muestra abajo
    }
  }

  async function alGuardarPreset(): Promise<void> {
    if (!nombrePreset.trim()) return;
    await crearPreset({ nombre: nombrePreset.trim(), pipeline }).unwrap();
    setNombrePreset("");
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Button variant="contained" onClick={alEjecutar} disabled={!imagenId || isLoading}>
        {isLoading ? "Ejecutando OCR…" : "Ejecutar OCR"}
      </Button>

      {error && <Alert severity="error">{extraerMensajeError(error)}</Alert>}

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

      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label="Nombre del preset"
          value={nombrePreset}
          onChange={(evento) => setNombrePreset(evento.target.value)}
          fullWidth
        />
        <Button variant="outlined" onClick={alGuardarPreset} disabled={!nombrePreset.trim() || guardando}>
          Guardar
        </Button>
      </Stack>
    </Stack>
  );
}
