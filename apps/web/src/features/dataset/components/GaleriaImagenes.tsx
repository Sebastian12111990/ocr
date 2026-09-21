import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

import { urlImagenDataset } from "../datasetApi";
import type { ImagenDataset } from "../dataset.types";

interface Props {
  imagenes: ImagenDataset[];
  renderAcciones?: (imagen: ImagenDataset) => ReactNode;
}

export function GaleriaImagenes({ imagenes, renderAcciones }: Props) {
  if (imagenes.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No hay imágenes en esta categoría.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 1.5,
      }}
    >
      {imagenes.map((imagen, indice) => (
        <Box
          key={imagen.nombre}
          data-indice={indice}
          sx={{ borderRadius: 1, overflow: "hidden", border: 1, borderColor: "divider" }}
        >
          <Box sx={{ position: "relative", width: "100%", aspectRatio: "4 / 3", bgcolor: "background.default" }}>
            <Box
              component="img"
              src={urlImagenDataset(imagen.origen, imagen.nombre)}
              alt={imagen.nombre}
              loading="lazy"
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {imagen.cajas.map((caja, indice) => (
              <Box
                key={indice}
                sx={{
                  position: "absolute",
                  left: `${(caja.xc - caja.ancho / 2) * 100}%`,
                  top: `${(caja.yc - caja.alto / 2) * 100}%`,
                  width: `${caja.ancho * 100}%`,
                  height: `${caja.alto * 100}%`,
                  border: "2px solid",
                  borderColor: "success.main",
                  borderRadius: 0.5,
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
                }}
              />
            ))}
          </Box>
          <Typography
            variant="caption"
            noWrap
            sx={{ display: "block", px: 0.75, py: 0.5, fontFamily: "monospace", color: "text.secondary" }}
          >
            {imagen.nombre}
          </Typography>
          {renderAcciones && <Box sx={{ px: 0.75, pb: 0.75 }}>{renderAcciones(imagen)}</Box>}
        </Box>
      ))}
    </Box>
  );
}
