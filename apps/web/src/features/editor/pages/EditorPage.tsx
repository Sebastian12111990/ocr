import { useState } from "react";
import { AppBar, Box, CircularProgress, Stack, Toolbar, Typography } from "@mui/material";

import { useObtenerCatalogoQuery } from "@/features/catalogo/catalogoApi";
import { SelectorImagenes } from "@/features/imagenes/components/SelectorImagenes";
import { PanelResultados } from "@/features/resultados/components/PanelResultados";
import { LienzoImagen } from "../components/LienzoImagen";
import { PanelControles } from "../components/PanelControles";
import { usePipeline } from "../usePipeline";
import { useVistaPrevia } from "../useVistaPrevia";

export function EditorPage() {
  const [imagenId, setImagenId] = useState<string | null>(null);
  const { data: catalogo, isLoading: cargandoCatalogo } = useObtenerCatalogoQuery();
  const pipeline = usePipeline(catalogo);
  const { urlImagen, cargando, error } = useVistaPrevia(imagenId, { modo: pipeline.modo, etapas: pipeline.etapas });

  if (cargandoCatalogo || !catalogo) {
    return (
      <Stack sx={{ height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack sx={{ height: "100vh" }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar variant="dense">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Editor OCR de patentes
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Stack spacing={2} sx={{ flex: 1, p: 2, minWidth: 0 }}>
          <Box sx={{ maxWidth: 360 }}>
            <SelectorImagenes imagenId={imagenId} onChange={setImagenId} />
          </Box>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <LienzoImagen urlImagen={urlImagen} cargando={cargando} error={error} />
          </Box>
        </Stack>

        <Box sx={{ width: 380, borderLeft: 1, borderColor: "divider", display: "flex", flexDirection: "column" }}>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <PanelControles catalogo={catalogo} pipeline={pipeline} />
          </Box>
          <Box sx={{ borderTop: 1, borderColor: "divider" }}>
            <PanelResultados imagenId={imagenId} pipeline={{ modo: pipeline.modo, etapas: pipeline.etapas }} />
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}
