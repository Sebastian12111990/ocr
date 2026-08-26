import { useEffect, useRef, useState } from "react";
import { MenuItem, TextField } from "@mui/material";

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
    ejecucion.patenteEsperada || ejecucion.imagen.nombreArchivo,
    modo,
    `${ejecucion.mejorCoincidencia.toFixed(0)}%`,
    `${ejecucion.candidatosGuardados} candidato${ejecucion.candidatosGuardados === 1 ? "" : "s"}`,
  ].join(" · ");
}

export function SelectorEjecuciones({ ejecucionId, onCargar, onVolverEdicion }: Props) {
  const { data: ejecuciones = [], isLoading, error: errorListado } = useListarEjecucionesQuery();
  const [obtenerEjecucion] = useLazyObtenerEjecucionQuery();
  const [seleccion, setSeleccion] = useState(ejecucionId ?? "");
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const solicitudRef = useRef<{ abort: () => void } | null>(null);

  useEffect(() => {
    setSeleccion(ejecucionId ?? "");
  }, [ejecucionId]);

  useEffect(() => () => {
    solicitudRef.current?.abort();
    solicitudRef.current = null;
  }, []);

  async function cambiarSeleccion(id: string): Promise<void> {
    solicitudRef.current?.abort();
    solicitudRef.current = null;
    setSeleccion(id);
    setErrorDetalle(null);

    if (!id) {
      setCargandoDetalle(false);
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

  const mensajeError = errorDetalle ?? (errorListado ? extraerMensajeError(errorListado) : null);

  return (
    <TextField
      select
      label={cargandoDetalle ? "Cargando ejecución…" : "Ejecución guardada"}
      value={seleccion}
      onChange={(evento) => void cambiarSeleccion(evento.target.value)}
      disabled={isLoading}
      error={mensajeError !== null}
      helperText={mensajeError ?? "Carga un resultado histórico sin volver a procesarlo"}
      fullWidth
    >
      <MenuItem value="">Edición actual</MenuItem>
      {ejecuciones.map((ejecucion) => (
        <MenuItem key={ejecucion.id} value={ejecucion.id}>
          {etiquetaEjecucion(ejecucion)}
        </MenuItem>
      ))}
      {!isLoading && ejecuciones.length === 0 && (
        <MenuItem disabled value="__sin_ejecuciones__">
          No hay ejecuciones guardadas
        </MenuItem>
      )}
    </TextField>
  );
}
