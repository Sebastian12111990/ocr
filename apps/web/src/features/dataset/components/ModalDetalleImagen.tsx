import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";

import { UkoDetailSection } from "@/shared/componentes/cards";
import { UkoChipGroup } from "@/shared/componentes/chips";
import { UkoDialog } from "@/shared/componentes/dialogs";
import { CajasSobreImagen, type FiltroConfianza } from "./CajasSobreImagen";
import { cajasPatente } from "../dataset.types";
import type { CajaDeteccion, ImagenDatasetResumida, TipoEtiquetaResumen } from "../dataset.types";

interface Props {
  imagen: ImagenDatasetResumida | null;
  tiposEtiqueta: TipoEtiquetaResumen[];
  filtroConfianza?: FiltroConfianza;
  onCicloVeredicto: (imagen: ImagenDatasetResumida, caja: CajaDeteccion) => void;
  onToggleEtiqueta: (imagen: ImagenDatasetResumida, clave: string) => void;
  onClose: () => void;
}

/** Vista grande de una imagen del dataset con todas las etiquetas de calidad — se sacaron de la
 * tarjeta chica de la galería porque ya no entraban legibles (ver GaleriaImagenes). Las de calidad
 * son independientes entre sí a propósito: un ángulo puede combinar, p.ej., "Ángulo izquierda" +
 * "Ángulo arriba" para una esquina. Se abre solo por click (imagen o lupa), nunca por hover — el
 * hover usa PreviewImagenDataset, que no es un Dialog a propósito (ver ese archivo). */
export function ModalDetalleImagen({
  imagen,
  tiposEtiqueta,
  filtroConfianza,
  onCicloVeredicto,
  onToggleEtiqueta,
  onClose,
}: Props) {
  const etiquetasCalidad = tiposEtiqueta.filter((tipo) => tipo.familia === "calidad");
  const clavesAsignadas = new Set(imagen?.etiquetas.map((etiqueta) => etiqueta.clave) ?? []);
  const proporcion = imagen ? imagen.ancho / imagen.alto : 1;
  // Solo patente: el vehículo ya se ve en la foto, mostrar su caja/chip no aporta a la revisión.
  const cajas = imagen ? cajasPatente(imagen.cajas) : [];

  return (
    <UkoDialog
      open={imagen !== null}
      onClose={onClose}
      maxWidth="lg"
      title="Detalle de imagen"
      subtitle={
        imagen && (
          <Tooltip title={imagen.rutaRelativa} placement="bottom-start">
            <Typography
              component="span"
              variant="caption"
              noWrap
              sx={{ display: "block", maxWidth: { xs: 240, sm: 620 }, fontFamily: "monospace" }}
            >
              {imagen.rutaRelativa}
            </Typography>
          </Tooltip>
        )
      }
      contentSx={{ p: 0 }}
    >
      {imagen && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 320px" },
            maxHeight: "calc(100dvh - 108px)",
            overflow: "auto",
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              minHeight: { xs: 280, md: 520 },
              p: { xs: 1, sm: 2 },
              display: "grid",
              placeItems: "center",
              bgcolor: "common.black",
              overflow: "auto",
            }}
          >
            <Box
              sx={{
                width: { xs: "100%", md: `min(900px, ${Math.round(proporcion * 70)}dvh, 100%)` },
                maxWidth: "100%",
                borderRadius: 1.5,
                overflow: "hidden",
                boxShadow: 8,
              }}
            >
              <CajasSobreImagen
                imagen={imagen}
                filtroConfianza={filtroConfianza}
                onClicCaja={(caja) => onCicloVeredicto(imagen, caja)}
              />
            </Box>
          </Box>

          <Stack
            spacing={1.25}
            sx={{
              p: 1.5,
              minWidth: 0,
              borderLeft: { md: "1px solid" },
              borderTop: { xs: "1px solid", md: 0 },
              borderColor: "divider",
              bgcolor: "background.paper",
              overflowY: "auto",
            }}
          >
            <UkoDetailSection title="Información">
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1 }}>
                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "background.paper" }}>
                  <Typography variant="caption" color="text.secondary">Resolución</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{imagen.ancho} × {imagen.alto}</Typography>
                </Box>
                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "background.paper" }}>
                  <Typography variant="caption" color="text.secondary">Detecciones</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{cajas.length}</Typography>
                </Box>
              </Box>
            </UkoDetailSection>

            <UkoDetailSection
              title="Detecciones"
              description="Selecciona una caja para cambiar su veredicto."
            >
              <UkoChipGroup>
                {cajas.map((caja, indice) => {
                  // caja.ancho/alto vienen normalizados (xywhn de YOLO, 0-1) — hay que escalarlos
                  // por la resolución real de la imagen para mostrar píxeles.
                  const anchoPx = Math.round(caja.ancho * imagen.ancho);
                  const altoPx = Math.round(caja.alto * imagen.alto);
                  return (
                    <Chip
                      key={caja.id}
                      size="small"
                      label={`${indice + 1} · ${caja.clase} · ${(caja.confianza * 100).toFixed(0)}% · ancho=${anchoPx} alto=${altoPx}`}
                      color={caja.veredicto === "correcta" ? "success" : caja.veredicto === "falso_positivo" ? "error" : "warning"}
                      variant={caja.veredicto ? "filled" : "outlined"}
                      onClick={() => onCicloVeredicto(imagen, caja)}
                    />
                  );
                })}
              </UkoChipGroup>
            </UkoDetailSection>

            <UkoDetailSection
              title="Calidad de imagen"
              description="Puedes seleccionar más de una condición."
              sx={{ flex: 1 }}
            >
              <UkoChipGroup columnGap={1} rowGap={1.25}>
              {etiquetasCalidad.map((tipo) => {
                const asignada = clavesAsignadas.has(tipo.clave);
                return (
                  <Chip
                    key={tipo.clave}
                    label={tipo.nombre}
                    size="small"
                    color={asignada ? "primary" : "default"}
                    variant={asignada ? "filled" : "outlined"}
                    onClick={() => onToggleEtiqueta(imagen, tipo.clave)}
                    sx={asignada ? { fontWeight: 700 } : { borderStyle: "dashed" }}
                  />
                );
              })}
              </UkoChipGroup>
            </UkoDetailSection>
          </Stack>
        </Box>
      )}
    </UkoDialog>
  );
}
