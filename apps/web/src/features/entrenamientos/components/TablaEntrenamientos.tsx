import { Chip, Typography } from "@mui/material";

import { UkoTable, type UkoTableColumn } from "@/shared/componentes/table";
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

const COLUMNAS: UkoTableColumn<ResumenEntrenamiento>[] = [
  {
    id: "nombre",
    label: "Nombre",
    minWidth: 330,
    render: (row) => <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.nombre}</Typography>,
    sortValue: (row) => row.nombre,
  },
  {
    id: "tipo",
    label: "Tipo",
    minWidth: 145,
    render: (row) => <Chip size="small" color={COLOR_TIPO[row.tipo]} label={ETIQUETA_TIPO[row.tipo]} />,
    sortValue: (row) => ETIQUETA_TIPO[row.tipo],
  },
  {
    id: "modelo",
    label: "Modelo base",
    minWidth: 260,
    nowrap: true,
    render: (row) => <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{row.modeloBase}</Typography>,
    sortValue: (row) => row.modeloBase,
  },
  {
    id: "imagenes",
    label: "Imágenes",
    align: "right",
    minWidth: 120,
    nowrap: true,
    render: (row) => row.imagenesConDeteccion !== null
      ? `${row.imagenesConDeteccion.toLocaleString("es-CL")} / ${row.totalImagenes.toLocaleString("es-CL")}`
      : row.totalImagenes.toLocaleString("es-CL"),
    sortValue: (row) => row.totalImagenes,
  },
  {
    id: "map50",
    label: "mAP50",
    align: "right",
    minWidth: 90,
    nowrap: true,
    render: (row) => row.metricasFinales?.map50 !== undefined ? row.metricasFinales.map50.toFixed(3) : "—",
    sortValue: (row) => row.metricasFinales?.map50,
  },
  {
    id: "duracion",
    label: "Duración",
    align: "right",
    minWidth: 110,
    nowrap: true,
    render: (row) => formatearDuracion(row.duracionMs),
    sortValue: (row) => row.duracionMs,
  },
  {
    id: "fecha",
    label: "Fecha",
    minWidth: 190,
    nowrap: true,
    render: (row) => formatearFecha(row.creadoEn),
    sortValue: (row) => new Date(row.creadoEn).getTime(),
  },
];

export function TablaEntrenamientos({ entrenamientos, seleccionadoId, onSeleccionar }: TablaEntrenamientosProps) {
  return (
    <UkoTable
      ariaLabel="Historial de entrenamientos YOLO"
      columns={COLUMNAS}
      rows={entrenamientos}
      getRowId={(row) => row.id}
      selectedRowId={seleccionadoId}
      onRowClick={onSeleccionar}
      emptyMessage="Todavía no hay corridas registradas."
      maxHeight="52vh"
    />
  );
}
