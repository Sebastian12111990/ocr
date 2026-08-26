import { Box, CircularProgress, Stack, Typography } from "@mui/material";

interface Props {
  urlImagen: string | null;
  cargando: boolean;
  error: string | null;
}

export function LienzoImagen({ urlImagen, cargando, error }: Props) {
  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.900",
        borderRadius: 2,
        minHeight: 480,
        overflow: "hidden",
      }}
    >
      {urlImagen && (
        <Box component="img" src={urlImagen} alt="Vista previa procesada" sx={{ maxWidth: "100%", maxHeight: 640 }} />
      )}

      {!urlImagen && !error && (
        <Typography variant="body2" sx={{ color: "grey.400" }}>
          Selecciona una imagen para empezar.
        </Typography>
      )}

      {error && (
        <Stack
          spacing={1}
          sx={{
            position: "absolute",
            inset: 0,
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0,0,0,0.6)",
          }}
        >
          <Typography variant="body2" sx={{ color: "error.light" }}>
            {error}
          </Typography>
        </Stack>
      )}

      {cargando && (
        <Box sx={{ position: "absolute", top: 12, right: 12 }}>
          <CircularProgress size={22} sx={{ color: "common.white" }} />
        </Box>
      )}
    </Box>
  );
}
