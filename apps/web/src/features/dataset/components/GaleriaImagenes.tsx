import { useEffect, useRef, useState } from "react";
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { SearchOutlined } from "@mui/icons-material";

import { CajasSobreImagen, type FiltroConfianza } from "./CajasSobreImagen";
import { ModalDetalleImagen } from "./ModalDetalleImagen";
import { CLAVE_DESCARTADA, CLAVE_REVISADA } from "../dataset.types";
import type { CajaDeteccion, ImagenDatasetResumida, TipoEtiquetaResumen } from "../dataset.types";

/** Color de las etiquetas de revisión (el gate del dataset): distinto de "primary" para que no
 * se confundan con las de calidad, que son solo descriptivas. */
const COLOR_REVISION: Record<string, "success" | "error"> = {
  [CLAVE_REVISADA]: "success",
  [CLAVE_DESCARTADA]: "error",
};

/** El chip de revisión es un botón de acción: en reposo dice el verbo ("Aceptar"/"Descartar"),
 * una vez marcado pasa al participio ("Aceptada"/"Descartada") para confirmar el estado. */
const TEXTO_REVISION: Record<string, { inactiva: string; activa: string }> = {
  [CLAVE_REVISADA]: { inactiva: "Aceptar", activa: "Aceptada" },
  [CLAVE_DESCARTADA]: { inactiva: "Descartar", activa: "Descartada" },
};

const ANCHO_COLUMNA_INICIAL = 220;
const ANCHO_COLUMNA_MIN = 120;
const ANCHO_COLUMNA_MAX = 420;

interface Props {
  imagenes: ImagenDatasetResumida[];
  tiposEtiqueta: TipoEtiquetaResumen[];
  indiceEnfocado: number;
  onEnfocar: (indice: number) => void;
  onCicloVeredicto: (imagen: ImagenDatasetResumida, caja: CajaDeteccion) => void;
  onToggleEtiqueta: (imagen: ImagenDatasetResumida, clave: string) => void;
  filtroConfianza?: FiltroConfianza;
}

export function GaleriaImagenes({
  imagenes,
  tiposEtiqueta,
  indiceEnfocado,
  onEnfocar,
  onCicloVeredicto,
  onToggleEtiqueta,
  filtroConfianza,
}: Props) {
  const etiquetasRevision = tiposEtiqueta.filter((tipo) => tipo.familia === "revision");

  // El modal de detalle solo abre por click en el botón "Ver" — ni al pasar el mouse ni al
  // hacer click en la imagen (esa sigue siendo solo para enfocarla). Se guarda el id, no la
  // imagen: si se guardara el objeto tal cual, quedaría una copia congelada del momento en que
  // se abrió, y los toggles de etiqueta hechos DESDE el propio modal (que actualizan `imagenes`,
  // no este estado) no se verían reflejados ahí adentro — los chips parecerían no reaccionar.
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const detalle = imagenes.find((imagen) => imagen.id === detalleId) ?? null;

  // Ctrl/Cmd + scroll agranda o achica las miniaturas (zoom de grilla, no de la imagen individual).
  // Va con addEventListener nativo y passive: false porque React registra `onWheel` como pasivo:
  // ahí `preventDefault` no hace nada y el navegador terminaría haciendo zoom de página en vez de
  // esto. Sin Ctrl el wheel sigue siendo el scroll normal de la página.
  const [anchoColumna, setAnchoColumna] = useState(ANCHO_COLUMNA_INICIAL);
  const refGrilla = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grilla = refGrilla.current;
    if (!grilla) return;
    const alHacerWheel = (evento: WheelEvent) => {
      if (!evento.ctrlKey) return;
      evento.preventDefault();
      setAnchoColumna((actual) =>
        Math.min(ANCHO_COLUMNA_MAX, Math.max(ANCHO_COLUMNA_MIN, actual - evento.deltaY * 0.5)),
      );
    };
    grilla.addEventListener("wheel", alHacerWheel, { passive: false });
    return () => grilla.removeEventListener("wheel", alHacerWheel);
  }, []);

  if (imagenes.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No hay imágenes en esta categoría.
      </Typography>
    );
  }

  return (
    <>
      <Box
        ref={refGrilla}
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${anchoColumna}px, 1fr))`,
          gap: 1.5,
        }}
      >
        {imagenes.map((imagen, indice) => {
          const enfocada = indice === indiceEnfocado;
          return (
            <Box
              key={imagen.id}
              data-indice={indice}
              onClick={() => onEnfocar(indice)}
              sx={{
                borderRadius: 1,
                overflow: "hidden",
                border: enfocada ? 2 : 1,
                borderColor: enfocada ? "primary.main" : "divider",
                cursor: "pointer",
              }}
            >
              <CajasSobreImagen
                imagen={imagen}
                filtroConfianza={filtroConfianza}
                onClicCaja={(caja) => {
                  onEnfocar(indice);
                  onCicloVeredicto(imagen, caja);
                }}
              />
              <Typography
                variant="caption"
                noWrap
                sx={{ display: "block", px: 0.75, py: 0.5, fontFamily: "monospace", color: "text.secondary" }}
              >
                {imagen.rutaRelativa.split("/").pop()}
              </Typography>
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ px: 0.75, py: 0.75, alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}
              >
                {etiquetasRevision.map((tipo) => {
                  const asignada = imagen.etiquetas.some((etiqueta) => etiqueta.clave === tipo.clave);
                  const color = COLOR_REVISION[tipo.clave] ?? "primary";
                  const texto = TEXTO_REVISION[tipo.clave];
                  const label = texto ? (asignada ? texto.activa : texto.inactiva) : tipo.nombre;
                  return (
                    <Chip
                      key={tipo.clave}
                      label={label}
                      size="small"
                      color={asignada ? color : "default"}
                      variant={asignada ? "filled" : "outlined"}
                      onClick={(evento) => {
                        evento.stopPropagation();
                        onToggleEtiqueta(imagen, tipo.clave);
                      }}
                      sx={asignada ? { fontWeight: 700 } : { borderStyle: "dashed", "&:hover": { opacity: 0.8 } }}
                    />
                  );
                })}
                <Tooltip title="Ver detalle" disableInteractive>
                  <IconButton
                    size="small"
                    sx={{ ml: "auto" }}
                    onClick={(evento) => {
                      evento.stopPropagation();
                      onEnfocar(indice);
                      setDetalleId(imagen.id);
                    }}
                  >
                    <SearchOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          );
        })}
      </Box>

      <ModalDetalleImagen
        imagen={detalle}
        tiposEtiqueta={tiposEtiqueta}
        filtroConfianza={filtroConfianza}
        onCicloVeredicto={onCicloVeredicto}
        onToggleEtiqueta={onToggleEtiqueta}
        onClose={() => setDetalleId(null)}
      />
    </>
  );
}
