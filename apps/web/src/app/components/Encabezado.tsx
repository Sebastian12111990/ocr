import { useMemo, useState, type ReactNode } from "react";
import {
  Apps as AppsIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Close as CloseIcon,
  EditNote as EditNoteIcon,
  FolderOpen as FolderOpenIcon,
  FormatTextdirectionLToR as LtrIcon,
  FormatTextdirectionRToL as RtlIcon,
  Insights as InsightsIcon,
  Menu as MenuIcon,
  NotificationsNone as NotificationsIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  InputBase,
  ListItemIcon,
  MenuItem,
  Popover,
  Slide,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, styled, useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";

import { rutas } from "@/shared/rutas";
import { useThemeSettings } from "@/theme";
import { useLayout } from "./LayoutContext";

const HeaderRoot = styled(AppBar)(({ theme }) => ({
  paddingTop: "1rem",
  paddingBottom: "1rem",
  color: theme.palette.text.primary,
  backgroundColor: alpha(theme.palette.background.default, 0.82),
  backdropFilter: "blur(6px)",
}));

const HeaderToolbar = styled(Toolbar)({
  "@media (min-width: 0px)": { paddingLeft: 0, paddingRight: 0, minHeight: "auto" },
});

interface BotonPopoverProps {
  etiqueta: string;
  icono: ReactNode;
  ancho?: number;
  children: (cerrar: () => void) => ReactNode;
}

function BotonPopover({ etiqueta, icono, ancho = 280, children }: BotonPopoverProps) {
  const [ancla, setAncla] = useState<HTMLElement | null>(null);
  const cerrar = () => setAncla(null);
  return (
    <>
      <Tooltip title={etiqueta}>
        <IconButton onClick={(evento) => setAncla(evento.currentTarget)} aria-label={etiqueta}>
          {icono}
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(ancla)}
        anchorEl={ancla}
        onClose={cerrar}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        slotProps={{ paper: { sx: { mt: 1, width: ancho, py: 1 } } }}
      >
        {children(cerrar)}
      </Popover>
    </>
  );
}

function Buscador({ abierto, cerrar }: { abierto: boolean; cerrar: () => void }) {
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const opciones = useMemo(
    () => [
      { nombre: "Editor OCR", ruta: rutas.editor.raiz },
      { nombre: "Dataset", ruta: rutas.dataset.raiz },
      { nombre: "Entrenamientos", ruta: rutas.entrenamientos.raiz },
    ],
    [],
  );
  const coincidencia = opciones.find((opcion) => opcion.nombre.toLowerCase().includes(texto.toLowerCase()));
  const buscar = () => {
    if (coincidencia) navigate(coincidencia.ruta);
    cerrar();
    setTexto("");
  };

  return (
    <Slide direction="down" in={abierto} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: "absolute",
          inset: "-16px 0 auto 0",
          zIndex: 10,
          height: 60,
          px: 2,
          display: "flex",
          gap: 1,
          alignItems: "center",
          borderRadius: 1,
          bgcolor: "background.paper",
          boxShadow: 1,
        }}
      >
        <InputBase
          fullWidth
          autoFocus
          value={texto}
          placeholder="Buscar sección..."
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={(evento) => evento.key === "Enter" && buscar()}
          startAdornment={<InputAdornment position="start"><SearchIcon sx={{ color: "grey.400" }} /></InputAdornment>}
          sx={{ fontSize: 13, fontWeight: 500 }}
        />
        <Button onClick={buscar}>Buscar</Button>
        <IconButton onClick={cerrar} aria-label="Cerrar búsqueda"><CloseIcon /></IconButton>
      </Box>
    </Slide>
  );
}

export function Encabezado() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, saveSettings } = useThemeSettings();
  const { abrirSidebarMovil } = useLayout();
  const esMovil = useMediaQuery(theme.breakpoints.down("lg"));
  const mostrarAcciones = useMediaQuery(theme.breakpoints.up("sm"));
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [idioma, setIdioma] = useState<"es" | "en">("es");

  const irA = (ruta: string, cerrar: () => void) => {
    navigate(ruta);
    cerrar();
  };

  return (
    <HeaderRoot position="sticky">
      <HeaderToolbar sx={{ position: "relative" }}>
        {esMovil && (
          <Tooltip title="Abrir menú">
            <IconButton onClick={abrirSidebarMovil}><MenuIcon /></IconButton>
          </Tooltip>
        )}
        <Tooltip title="Buscar">
          <IconButton onClick={() => setBusquedaAbierta(true)}>
            <SearchIcon sx={{ color: "grey.400", fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <Buscador abierto={busquedaAbierta} cerrar={() => setBusquedaAbierta(false)} />

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title={settings.direction === "rtl" ? "Dirección izquierda a derecha" : "Dirección derecha a izquierda"}>
          <IconButton onClick={() => saveSettings({ direction: settings.direction === "rtl" ? "ltr" : "rtl" })}>
            {settings.direction === "rtl" ? <LtrIcon sx={{ color: "grey.400" }} /> : <RtlIcon sx={{ color: "grey.400" }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title={settings.theme === "light" ? "Modo oscuro" : "Modo claro"}>
          <IconButton onClick={() => saveSettings({ theme: settings.theme === "light" ? "dark" : "light" })}>
            {settings.theme === "light" ? <LightModeIcon sx={{ color: "warning.main", fontSize: 20 }} /> : <DarkModeIcon sx={{ color: "grey.400", fontSize: 20 }} />}
          </IconButton>
        </Tooltip>

        {mostrarAcciones && (
          <>
            <BotonPopover
              etiqueta="Idioma"
              ancho={145}
              icono={<Box sx={{ width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "grey.100", fontSize: 17 }}>{idioma === "es" ? "🇨🇱" : "🇺🇸"}</Box>}
            >
              {(cerrar) => (
                <>
                  <MenuItem selected={idioma === "es"} onClick={() => { setIdioma("es"); cerrar(); }}>Español</MenuItem>
                  <MenuItem selected={idioma === "en"} onClick={() => { setIdioma("en"); cerrar(); }}>English</MenuItem>
                </>
              )}
            </BotonPopover>
            <BotonPopover
              etiqueta="Notificaciones"
              ancho={320}
              icono={<Badge color="error" variant="dot" invisible><NotificationsIcon sx={{ color: "grey.400", fontSize: 20 }} /></Badge>}
            >
              {() => (
                <>
                  <Typography sx={{ px: 2, py: 1, fontWeight: 600 }}>Notificaciones</Typography>
                  <Divider />
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                    No hay notificaciones nuevas.
                  </Typography>
                </>
              )}
            </BotonPopover>
            <BotonPopover etiqueta="Aplicaciones" ancho={300} icono={<AppsIcon sx={{ color: "grey.400", fontSize: 20 }} />}>
              {(cerrar) => (
                <>
                  <Typography sx={{ px: 2, py: 1, fontWeight: 600 }}>Aplicaciones y servicios</Typography>
                  <Divider />
                  {[
                    { nombre: "Editor OCR", detalle: "Pipeline de procesamiento", ruta: rutas.editor.raiz, icono: <EditNoteIcon /> },
                    { nombre: "Dataset", detalle: "Curación y etiquetado", ruta: rutas.dataset.raiz, icono: <FolderOpenIcon /> },
                    { nombre: "Entrenamientos", detalle: "Métricas YOLO", ruta: rutas.entrenamientos.raiz, icono: <InsightsIcon /> },
                  ].map((item) => (
                    <MenuItem key={item.nombre} selected={location.pathname === item.ruta} onClick={() => irA(item.ruta, cerrar)} sx={{ py: 1.25 }}>
                      <ListItemIcon sx={{ color: "primary.main" }}>{item.icono}</ListItemIcon>
                      <Box><Typography variant="body2" sx={{ fontWeight: 500 }}>{item.nombre}</Typography><Typography variant="caption" color="text.secondary">{item.detalle}</Typography></Box>
                    </MenuItem>
                  ))}
                </>
              )}
            </BotonPopover>
          </>
        )}

        <BotonPopover
          etiqueta="Perfil"
          ancho={230}
          icono={<Avatar sx={{ width: 35, height: 35, fontSize: 12, bgcolor: "primary.main", outline: `1px solid ${theme.palette.primary.main}`, outlineOffset: 2 }}>OCR</Avatar>}
        >
          {(cerrar) => (
            <>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", px: 2, py: 1 }}>
                <Avatar sx={{ width: 35, height: 35, fontSize: 12, bgcolor: "primary.main" }}>OCR</Avatar>
                <Box><Typography variant="body2" sx={{ fontWeight: 600 }}>OCR Patentes</Typography><Typography variant="caption" color="text.secondary">Visión artificial</Typography></Box>
              </Stack>
              <Divider />
              <MenuItem onClick={() => irA(rutas.editor.raiz, cerrar)}>Editor</MenuItem>
              <MenuItem onClick={() => irA(rutas.dataset.raiz, cerrar)}>Dataset</MenuItem>
              <MenuItem onClick={() => irA(rutas.entrenamientos.raiz, cerrar)}>Entrenamientos</MenuItem>
            </>
          )}
        </BotonPopover>
      </HeaderToolbar>
    </HeaderRoot>
  );
}
