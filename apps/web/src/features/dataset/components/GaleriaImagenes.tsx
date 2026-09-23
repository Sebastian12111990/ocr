import { Box, Chip, Stack, Typography } from "@mui/material";

import { urlImagenDataset } from "../datasetApi";
import type { CajaDeteccion, ImagenDatasetResumida, TipoEtiquetaResumen } from "../dataset.types";

const COLOR_VEREDICTO: Record<string, "success.main" | "error.main" | "warning.main"> = {
  correcta: "success.main",
  falso_positivo: "error.main",
};

interface Props {
  imagenes: ImagenDatasetResumida[];
  tiposEtiqueta: TipoEtiquetaResumen[];
  onCicloVeredicto: (imagen: ImagenDatasetResumida, caja: CajaDeteccion) => void;
  onToggleEtiqueta: (imagen: ImagenDatasetResumida, clave: string) => void;
}

/** aspectRatio real por imagen (no un 4/3 fijo) + objectFit "contain": las cajas en % del
 * contenedor solo caen sobre la patente si el contenedor tiene la misma proporción que la
 * imagen — con "cover" (versión anterior) se recortaba y quedaban desalineadas. */
export function GaleriaImagenes({ imagenes, tiposEtiqueta, onCicloVeredicto, onToggleEtiqueta }: Props) {
  const etiquetasChip = tiposEtiqueta.filter((tipo) => tipo.familia === "calidad" || tipo.familia === "revision");

  if (imagenes.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No hay imágenes en esta categoría.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 1.5 }}>
      {imagenes.map((imagen, indice) => {
        const clavesAsignadas = new Set(imagen.etiquetas.map((etiqueta) => etiqueta.clave));
        return (
          <Box
            key={imagen.id}
            data-indice={indice}
            sx={{ borderRadius: 1, overflow: "hidden", border: 1, borderColor: "divider" }}
          >
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: `${imagen.ancho} / ${imagen.alto}`,
                bgcolor: "background.default",
              }}
            >
              <Box
                component="img"
                src={urlImagenDataset(imagen.id)}
                alt={imagen.rutaRelativa}
                loading="lazy"
                sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
              {imagen.cajas.map((caja) => (
                <Box
                  key={caja.id}
                  onClick={() => onCicloVeredicto(imagen, caja)}
                  title={`${caja.clase} (${(caja.confianza * 100).toFixed(0)}%) — click para marcar veredicto`}
                  sx={{
                    position: "absolute",
                    left: `${(caja.xc - caja.ancho / 2) * 100}%`,
                    top: `${(caja.yc - caja.alto / 2) * 100}%`,
                    width: `${caja.ancho * 100}%`,
                    height: `${caja.alto * 100}%`,
                    border: "2px solid",
                    borderColor: caja.veredicto ? COLOR_VEREDICTO[caja.veredicto] : "warning.main",
                    borderRadius: 0.5,
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </Box>
            <Typography
              variant="caption"
              noWrap
              sx={{ display: "block", px: 0.75, py: 0.5, fontFamily: "monospace", color: "text.secondary" }}
            >
              {imagen.rutaRelativa.split("/").pop()}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ px: 0.75, pb: 0.75, flexWrap: "wrap", rowGap: 0.5 }}>
              {etiquetasChip.map((tipo) => {
                const asignada = clavesAsignadas.has(tipo.clave);
                return (
                  <Chip
                    key={tipo.clave}
                    label={tipo.nombre}
                    size="small"
                    color={asignada ? "primary" : "default"}
                    variant={asignada ? "filled" : "outlined"}
                    onClick={() => onToggleEtiqueta(imagen, tipo.clave)}
                    sx={
                      asignada
                        ? { fontWeight: 700 }
                        : { opacity: 0.4, borderStyle: "dashed", "&:hover": { opacity: 0.8 } }
                    }
                  />
                );
              })}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}
