import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import { Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";

interface Props {
  urlImagen: string | null;
  cargando: boolean;
  error: string | null;
}

export function LienzoImagen({ urlImagen, cargando, error }: Props) {
  const [vistaAmpliada, setVistaAmpliada] = useState(false);
  const [posicion, setPosicion] = useState({ x: 0, y: 0 });
  const [sePuedeArrastrar, setSePuedeArrastrar] = useState(false);
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const imagenRef = useRef<HTMLImageElement | null>(null);
  const dialogoRef = useRef<HTMLDivElement | null>(null);
  const arrastre = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setPosicion({ x: 0, y: 0 });
    setSePuedeArrastrar(false);
  }, [urlImagen]);

  function actualizarCapacidadDeArrastre(): void {
    const contenedor = contenedorRef.current;
    const imagen = imagenRef.current;
    if (!contenedor || !imagen) return;
    setSePuedeArrastrar(
      imagen.naturalWidth > contenedor.clientWidth || imagen.naturalHeight > contenedor.clientHeight,
    );
  }

  async function abrirPantallaCompleta(): Promise<void> {
    if (dialogoRef.current?.requestFullscreen) await dialogoRef.current.requestFullscreen();
  }

  return (
    <Box
      ref={contenedorRef}
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.900",
        borderRadius: 2,
        height: 480,
        minHeight: 480,
        maxHeight: 480,
        flexShrink: 0,
        overflow: "hidden",
        touchAction: "none",
      }}
      onPointerDown={(evento) => {
        if (!sePuedeArrastrar || !urlImagen) return;
        arrastre.current = { x: evento.clientX, y: evento.clientY };
        evento.currentTarget.setPointerCapture(evento.pointerId);
      }}
      onPointerMove={(evento) => {
        if (!arrastre.current) return;
        const deltaX = evento.clientX - arrastre.current.x;
        const deltaY = evento.clientY - arrastre.current.y;
        arrastre.current = { x: evento.clientX, y: evento.clientY };
        const contenedor = contenedorRef.current;
        const imagen = imagenRef.current;
        if (!contenedor || !imagen) return;
        const limiteX = Math.max(0, (imagen.naturalWidth - contenedor.clientWidth) / 2);
        const limiteY = Math.max(0, (imagen.naturalHeight - contenedor.clientHeight) / 2);
        setPosicion((actual) => ({
          x: Math.max(-limiteX, Math.min(limiteX, actual.x + deltaX)),
          y: Math.max(-limiteY, Math.min(limiteY, actual.y + deltaY)),
        }));
      }}
      onPointerUp={(evento) => {
        arrastre.current = null;
        if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
          evento.currentTarget.releasePointerCapture(evento.pointerId);
        }
      }}
      onPointerCancel={() => {
        arrastre.current = null;
      }}
    >
      {urlImagen && (
        <Box
          ref={imagenRef}
          component="img"
          src={urlImagen}
          alt="Vista previa procesada"
          draggable={false}
          onLoad={actualizarCapacidadDeArrastre}
          sx={{
            maxWidth: "none",
            maxHeight: "none",
            userSelect: "none",
            cursor: sePuedeArrastrar ? (arrastre.current ? "grabbing" : "grab") : "default",
            transform: `translate(${posicion.x}px, ${posicion.y}px)`,
            transition: arrastre.current ? "none" : "transform 100ms ease-out",
          }}
        />
      )}

      {urlImagen && (
        <Tooltip title="Ampliar vista">
          <IconButton
            size="small"
            aria-label="Ampliar vista"
            onClick={() => setVistaAmpliada(true)}
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
              bgcolor: "rgba(0,0,0,0.65)",
              color: "common.white",
              "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
            }}
          >
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {!urlImagen && !error && !cargando && (
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

      <Dialog
        fullWidth
        maxWidth="xl"
        open={vistaAmpliada}
        onClose={() => setVistaAmpliada(false)}
        slotProps={{ paper: { ref: dialogoRef, sx: { height: "88vh", bgcolor: "grey.900" } } }}
      >
        <DialogTitle component="div" sx={{ py: 1 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="subtitle1">Vista ampliada</Typography>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Pantalla completa">
                <IconButton aria-label="Pantalla completa" onClick={abrirPantallaCompleta}>
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cerrar">
                <IconButton aria-label="Cerrar vista ampliada" onClick={() => setVistaAmpliada(false)}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 1, overflow: "auto" }}>
          {urlImagen && (
            <Box
              component="img"
              src={urlImagen}
              alt="Vista procesada ampliada"
              sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
