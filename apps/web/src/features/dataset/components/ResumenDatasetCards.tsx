import {
  DirectionsCarOutlined,
  FactCheckOutlined,
  ImageOutlined,
  NoCrashOutlined,
  PendingActionsOutlined,
  PinOutlined,
  RemoveRoadOutlined,
} from "@mui/icons-material";
import { Box } from "@mui/material";

import { UkoStatCard } from "@/shared/componentes/cards";
import { ETIQUETAS_VISTA, type ResumenDataset } from "../dataset.types";

export function ResumenDatasetCards({ resumen }: { resumen: ResumenDataset }) {
  // "Aceptada" = lista para entrenar (revisada y no descartada); "descartada" = con etiqueta
  // descartada; "pendiente" = ninguna de las dos todavía — las tres suman siempre el total
  // filtrado (planta/fecha), igual que el contador de la pestaña "Todas" (mismos valores que
  // devuelve el backend en `porVista`, ver pestaña "Pendiente").
  const aceptadas = resumen.porVista.aceptada;
  const descartadas = resumen.porVista.descartada;
  const pendientes = resumen.porVista.pendiente;

  const tarjetas = [
    {
      etiqueta: "Listas para entrenar",
      valor: resumen.imagenesListasParaEntrenar,
      icono: <FactCheckOutlined />,
      tone: "success" as const,
      highlighted: true,
    },
    {
      etiqueta: "Total imágenes",
      valor: resumen.totalImagenes,
      caption: `${aceptadas.toLocaleString("es-CL")} aceptadas · ${descartadas.toLocaleString("es-CL")} descartadas · ${pendientes.toLocaleString("es-CL")} pendientes`,
      icono: <ImageOutlined />,
      tone: "primary" as const,
    },
    {
      etiqueta: "Patentes pendientes",
      valor: resumen.cajasPatente.pendientes,
      caption: `de ${resumen.cajasPatente.total.toLocaleString("es-CL")} cajas — ${resumen.cajasPatente.conVeredicto.toLocaleString("es-CL")} con veredicto`,
      icono: <PendingActionsOutlined />,
      tone: "warning" as const,
    },
    {
      etiqueta: ETIQUETAS_VISTA.vehiculo_con_patente,
      valor: resumen.porVista.vehiculo_con_patente,
      icono: <DirectionsCarOutlined />,
      tone: "info" as const,
    },
    {
      etiqueta: ETIQUETAS_VISTA.solo_patente,
      valor: resumen.porVista.solo_patente,
      icono: <PinOutlined />,
      tone: "warning" as const,
    },
    {
      etiqueta: ETIQUETAS_VISTA.vehiculo_sin_patente,
      valor: resumen.porVista.vehiculo_sin_patente,
      icono: <NoCrashOutlined />,
      tone: "error" as const,
    },
    {
      etiqueta: ETIQUETAS_VISTA.sin_deteccion,
      valor: resumen.porVista.sin_deteccion,
      icono: <RemoveRoadOutlined />,
      tone: "primary" as const,
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
        gap: 1.5,
      }}
    >
      {tarjetas.map((tarjeta) => (
        <UkoStatCard
          key={tarjeta.etiqueta}
          label={tarjeta.etiqueta}
          value={tarjeta.valor}
          icon={tarjeta.icono}
          tone={tarjeta.tone}
          highlighted={tarjeta.highlighted}
          caption={"caption" in tarjeta ? tarjeta.caption : undefined}
        />
      ))}
    </Box>
  );
}
