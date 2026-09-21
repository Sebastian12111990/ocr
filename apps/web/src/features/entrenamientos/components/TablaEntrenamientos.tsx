import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import type { ResumenEntrenamiento, TipoEntrenamientoYolo } from "../entrenamientos.types";

interface TablaEntrenamientosProps {
  entrenamientos: ResumenEntrenamiento[];
  seleccionadoId: string | null;
  onSeleccionar: (entrenamiento: ResumenEntrenamiento) => void;
}

const ETIQUETA_TIPO: Record<TipoEntrenamientoYolo, string> = {
  sondeo: "Sondeo",
  auto_etiquetado: "Auto-etiquetado",
  entrenamiento: "Entrenamiento",
};

const COLOR_TIPO: Record<TipoEntrenamientoYolo, "default" | "info" | "success"> = {
  sondeo: "default",
  auto_etiquetado: "info",
  entrenamiento: "success",
};

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(fecha);
}

function formatearDuracion(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const segundos = ms / 1000;
  if (segundos < 60) return `${segundos.toFixed(1)} s`;
  return `${(segundos / 60).toFixed(1)} min`;
}

export function TablaEntrenamientos({ entrenamientos, seleccionadoId, onSeleccionar }: TablaEntrenamientosProps) {
  if (entrenamientos.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Todavía no hay corridas registradas.
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Modelo base</TableCell>
            <TableCell align="right">Imágenes</TableCell>
            <TableCell>mAP50</TableCell>
            <TableCell align="right">Duración</TableCell>
            <TableCell>Fecha</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entrenamientos.map((entrenamiento) => (
            <TableRow
              key={entrenamiento.id}
              hover
              selected={entrenamiento.id === seleccionadoId}
              onClick={() => onSeleccionar(entrenamiento)}
              sx={{ cursor: "pointer" }}
            >
              <TableCell>{entrenamiento.nombre}</TableCell>
              <TableCell>
                <Chip size="small" color={COLOR_TIPO[entrenamiento.tipo]} label={ETIQUETA_TIPO[entrenamiento.tipo]} />
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                  {entrenamiento.modeloBase}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {entrenamiento.imagenesConDeteccion !== null
                  ? `${entrenamiento.imagenesConDeteccion} / ${entrenamiento.totalImagenes}`
                  : entrenamiento.totalImagenes}
              </TableCell>
              <TableCell>
                {entrenamiento.metricasFinales?.map50 !== undefined
                  ? entrenamiento.metricasFinales.map50.toFixed(3)
                  : "—"}
              </TableCell>
              <TableCell align="right">{formatearDuracion(entrenamiento.duracionMs)}</TableCell>
              <TableCell>{formatearFecha(entrenamiento.creadoEn)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
