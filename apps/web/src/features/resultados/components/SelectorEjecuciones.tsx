import { useEffect, useMemo, useRef, useState } from "react";
import { MenuItem, Stack, TextField } from "@mui/material";

import { extraerMensajeError } from "@/shared/utils/errores";
import { useLazyObtenerEjecucionQuery, useListarEjecucionesQuery } from "../resultadosApi";
import type { DetalleEjecucion, ResumenEjecucion } from "../resultados.types";

interface Props {
  ejecucionId: string | null;
  onCargar: (ejecucion: DetalleEjecucion) => void | Promise<void>;
  onVolverEdicion: () => void;
}

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(fecha);
}

function etiquetaEjecucion(ejecucion: ResumenEjecucion): string {
  const modo = ejecucion.modo === "libre" ? "Libre" : "Fijo";
  return [
    formatearFecha(ejecucion.creadoEn),
    modo,
    `${ejecucion.mejorCoincidencia.toFixed(0)}%`,
    `${ejecucion.candidatosGuardados} candidato${ejecucion.candidatosGuardados === 1 ? "" : "s"}`,
  ].join(" · ");
}

function normalizarPatente(patente: string): string {
  return patente.trim().toUpperCase();
}

export function SelectorEjecuciones({ ejecucionId, onCargar, onVolverEdicion }: Props) {
  const { data: ejecuciones = [], isLoading, error: errorListado } = useListarEjecucionesQuery();
  const [obtenerEjecucion] = useLazyObtenerEjecucionQuery();
  const [patenteSeleccionada, setPatenteSeleccionada] = useState("");
  const [seleccion, setSeleccion] = useState(ejecucionId ?? "");
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const solicitudRef = useRef<{ abort: () => void } | null>(null);
  const patentePendienteRef = useRef<string | null>(null);

  const patentes = useMemo(() => {
    const cantidades = new Map<string, number>();
    for (const ejecucion of ejecuciones) {
      const patente = normalizarPatente(ejecucion.patenteEsperada);
      cantidades.set(patente, (cantidades.get(patente) ?? 0) + 1);
    }
    return [...cantidades.entries()]
      .map(([patente, cantidad]) => ({ patente, cantidad }))
      .sort((a, b) => a.patente.localeCompare(b.patente, "es-CL"));
  }, [ejecuciones]);

  const ejecucionesDePatente = useMemo(
    () => ejecuciones.filter(
      (ejecucion) => normalizarPatente(ejecucion.patenteEsperada) === patenteSeleccionada,
    ),
    [ejecuciones, patenteSeleccionada],
  );

  useEffect(() => {
    setSeleccion(ejecucionId ?? "");
    if (ejecucionId) return;

    if (patentePendienteRef.current !== null) {
      setPatenteSeleccionada(patentePendienteRef.current);
      patentePendienteRef.current = null;
    } else {
      setPatenteSeleccionada("");
    }
  }, [ejecucionId]);

  useEffect(() => {
    if (!ejecucionId) return;
    const ejecucion = ejecuciones.find((item) => item.id === ejecucionId);
    if (ejecucion) setPatenteSeleccionada(normalizarPatente(ejecucion.patenteEsperada));
    patentePendienteRef.current = null;
  }, [ejecucionId, ejecuciones]);

  useEffect(() => () => {
    solicitudRef.current?.abort();
    solicitudRef.current = null;
  }, []);

  function cambiarPatente(patente: string): void {
    solicitudRef.current?.abort();
    solicitudRef.current = null;
    setCargandoDetalle(false);
    setErrorDetalle(null);
    setPatenteSeleccionada(patente);
    setSeleccion("");

    if (ejecucionId) {
      patentePendienteRef.current = patente || null;
      onVolverEdicion();
    } else if (!patente) {
      onVolverEdicion();
    }
  }

  async function cambiarSeleccion(id: string): Promise<void> {
    solicitudRef.current?.abort();
    solicitudRef.current = null;
    setSeleccion(id);
    setErrorDetalle(null);

    if (!id) {
      setCargandoDetalle(false);
      if (ejecucionId) patentePendienteRef.current = patenteSeleccionada;
      onVolverEdicion();
      return;
    }

    setCargandoDetalle(true);
    const solicitud = obtenerEjecucion(id);
    solicitudRef.current = solicitud;

    try {
      const detalle = await solicitud.unwrap();
      if (solicitudRef.current !== solicitud) return;
      await onCargar(detalle);
    } catch (error: unknown) {
      if (solicitudRef.current !== solicitud) return;
      setSeleccion(ejecucionId ?? "");
      setErrorDetalle(extraerMensajeError(error));
    } finally {
      if (solicitudRef.current === solicitud) {
        solicitudRef.current = null;
        setCargandoDetalle(false);
      }
    }
  }

  const mensajeErrorListado = errorListado ? extraerMensajeError(errorListado) : null;

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: "100%" }}>
      <TextField
        select
        label="Patente"
        value={patenteSeleccionada}
        onChange={(evento) => cambiarPatente(evento.target.value)}
        disabled={isLoading}
        error={mensajeErrorListado !== null}
        helperText={mensajeErrorListado ?? "Selecciona una patente"}
        fullWidth
      >
        <MenuItem value="">Edición actual</MenuItem>
        {patentes.map(({ patente, cantidad }) => (
          <MenuItem key={patente} value={patente}>
            {patente} · {cantidad} registro{cantidad === 1 ? "" : "s"}
          </MenuItem>
        ))}
        {!isLoading && patentes.length === 0 && (
          <MenuItem disabled value="__sin_patentes__">
            No hay patentes guardadas
          </MenuItem>
        )}
      </TextField>

      {patenteSeleccionada && (
        <TextField
          select
          label={cargandoDetalle ? "Cargando ejecución…" : "Registro de prueba"}
          value={seleccion}
          onChange={(evento) => void cambiarSeleccion(evento.target.value)}
          disabled={cargandoDetalle}
          error={errorDetalle !== null}
          helperText={errorDetalle ?? "Carga un resultado histórico"}
          fullWidth
        >
          <MenuItem value="">Selecciona un registro</MenuItem>
          {ejecucionesDePatente.map((ejecucion) => (
            <MenuItem key={ejecucion.id} value={ejecucion.id}>
              {etiquetaEjecucion(ejecucion)}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  );
}
