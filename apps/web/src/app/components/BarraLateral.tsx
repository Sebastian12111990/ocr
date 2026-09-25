import { useMemo, useState, type ReactNode } from "react";
import {
  AutoAwesome as AutoAwesomeIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  EditNote as EditNoteIcon,
  FolderOpen as FolderOpenIcon,
  Insights as InsightsIcon,
  ModelTraining as ModelTrainingIcon,
  Radar as RadarIcon,
} from "@mui/icons-material";
import { Box, ButtonBase, Collapse, Drawer, IconButton, Stack, Typography } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";

import { rutas } from "@/shared/rutas";
import { useLayout } from "./LayoutContext";

export const ANCHO_BARRA_LATERAL = 280;
export const ANCHO_BARRA_COMPACTA = 86;

const SidebarWrapper = styled("aside", {
  shouldForwardProp: (prop) => prop !== "compacta",
})<{ compacta: boolean }>(({ theme, compacta }) => ({
  width: compacta ? ANCHO_BARRA_COMPACTA : ANCHO_BARRA_LATERAL,
  height: "100vh",
  position: "fixed",
  top: 0,
  insetInlineStart: 0,
  zIndex: theme.zIndex.drawer,
  overflow: "hidden",
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.mode === "dark"
    ? theme.palette.background.default
    : theme.palette.background.paper,
  borderInlineEnd: theme.palette.mode === "dark" ? 0 : `1px dashed ${theme.palette.grey[200]}`,
  transition: "width 200ms ease",
  ...(compacta && { "&:hover": { width: ANCHO_BARRA_LATERAL } }),
}));

const NavButton = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== "activo",
})<{ activo: boolean }>(({ theme, activo }) => ({
  width: "100%",
  height: 44,
  padding: "0 18px",
  marginBottom: 4,
  borderRadius: 10,
  justifyContent: "flex-start",
  color: activo ? theme.palette.primary.main : theme.palette.text.secondary,
  backgroundColor: activo ? alpha(theme.palette.primary.main, 0.08) : "transparent",
  "&:hover": {
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
}));

const TextoItem = styled("span", {
  shouldForwardProp: (prop) => prop !== "oculto",
})<{ oculto: boolean }>(({ oculto }) => ({
  minWidth: 0,
  paddingLeft: "0.8rem",
  overflow: "hidden",
  fontSize: 14,
  fontWeight: 500,
  whiteSpace: "nowrap",
  opacity: oculto ? 0 : 1,
  width: oculto ? 0 : "auto",
  transition: "opacity 150ms ease",
}));

interface NavItemProps {
  activo: boolean;
  compacto: boolean;
  icono: ReactNode;
  etiqueta: string;
  onClick: () => void;
}

function NavItem({ activo, compacto, icono, etiqueta, onClick }: NavItemProps) {
  return (
    <NavButton activo={activo} onClick={onClick}>
      <Box sx={{ display: "grid", placeItems: "center", width: 20, flexShrink: 0 }}>{icono}</Box>
      <TextoItem oculto={compacto}>{etiqueta}</TextoItem>
    </NavButton>
  );
}

export function UkoLogo() {
  return (
    <Stack direction="row" sx={{ alignItems: "center", color: "primary.main" }}>
      <Box component="svg" viewBox="0 0 30 30" sx={{ width: 30, height: 30, flexShrink: 0 }}>
        <path
          d="M7.252 2c2.738 0 3.607 2.436 3.699 3.654v8.503c0 2.322.194 5.703 3.733 5.703 3.54 0 4.448-2.8 4.46-4.2.017-2.16.542-4.46 4.035-4.46 3.665 0 4.181 4.585 3.64 7.09-.6 3.14-3.866 9.424-12.135 9.424C6.415 27.714 3 21.431 3 16.24V5.961C3 4.322 3.83 2 7.252 2Z"
          fill="currentColor"
        />
        <circle cx="22.714" cy="6.286" r="4.286" fill="currentColor" />
      </Box>
    </Stack>
  );
}

function Navegacion({ compacta, onNavegar }: { compacta: boolean; onNavegar?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const enEntrenamientos = location.pathname.startsWith(rutas.entrenamientos.raiz);
  const [entrenamientosAbierto, setEntrenamientosAbierto] = useState(enEntrenamientos);
  const tipoActivo = new URLSearchParams(location.search).get("tipo") ?? "";

  const navegar = (ruta: string) => {
    navigate(ruta);
    onNavegar?.();
  };

  const subitems = useMemo(
    () => [
      { etiqueta: "Todos", tipo: "", icono: <InsightsIcon fontSize="small" /> },
      { etiqueta: "Sondeos", tipo: "sondeo", icono: <RadarIcon fontSize="small" /> },
      { etiqueta: "Auto-etiquetado", tipo: "auto_etiquetado", icono: <AutoAwesomeIcon fontSize="small" /> },
      { etiqueta: "Entrenamientos", tipo: "entrenamiento", icono: <ModelTrainingIcon fontSize="small" /> },
    ],
    [],
  );

  return (
    <Box sx={{ px: 2, pb: 3 }}>
      {!compacta && (
        <Typography sx={{ mt: 2.5, ml: 1.75, mb: 1.25, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>
          Procesamiento
        </Typography>
      )}
      <NavItem
        activo={location.pathname === rutas.editor.raiz}
        compacto={compacta}
        icono={<EditNoteIcon sx={{ fontSize: 18 }} />}
        etiqueta="Editor"
        onClick={() => navegar(rutas.editor.raiz)}
      />
      <NavItem
        activo={location.pathname === rutas.dataset.raiz}
        compacto={compacta}
        icono={<FolderOpenIcon sx={{ fontSize: 18 }} />}
        etiqueta="Dataset"
        onClick={() => navegar(rutas.dataset.raiz)}
      />
      <NavButton
        activo={enEntrenamientos}
        onClick={() => {
          setEntrenamientosAbierto((estado) => !estado);
          if (!enEntrenamientos) navegar(rutas.entrenamientos.raiz);
        }}
      >
        <Box sx={{ display: "grid", placeItems: "center", width: 20, flexShrink: 0 }}>
          <InsightsIcon sx={{ fontSize: 18 }} />
        </Box>
        <TextoItem oculto={compacta}>Entrenamientos</TextoItem>
        {!compacta && (
          <ChevronRightIcon
            sx={{ ml: "auto", fontSize: 18, transform: entrenamientosAbierto ? "rotate(90deg)" : "none", transition: "transform 200ms" }}
          />
        )}
      </NavButton>
      {!compacta && (
        <Collapse in={entrenamientosAbierto} unmountOnExit>
          <Box sx={{ pl: 1 }}>
            {subitems.map((item) => (
              <NavItem
                key={item.etiqueta}
                activo={enEntrenamientos && tipoActivo === item.tipo}
                compacto={false}
                icono={item.icono}
                etiqueta={item.etiqueta}
                onClick={() => navegar(item.tipo ? rutas.entrenamientos.conTipo(item.tipo) : rutas.entrenamientos.raiz)}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

export function BarraLateral() {
  const { sidebarCompacta, alternarSidebarCompacta } = useLayout();
  const [enHover, setEnHover] = useState(false);
  const compactaVisual = sidebarCompacta && !enHover;

  return (
    <SidebarWrapper
      compacta={sidebarCompacta}
      onMouseEnter={() => setEnHover(true)}
      onMouseLeave={() => sidebarCompacta && setEnHover(false)}
    >
      <Stack direction="row" sx={{ height: 70, px: 3.5, alignItems: "center", justifyContent: "space-between" }}>
        <UkoLogo />
        {!compactaVisual && (
          <IconButton size="small" onClick={alternarSidebarCompacta} aria-label="Alternar barra lateral">
            <ChevronLeftIcon sx={{ color: "grey.400", transform: sidebarCompacta ? "rotate(180deg)" : "none" }} />
          </IconButton>
        )}
      </Stack>
      <Box sx={{ height: "calc(100vh - 70px)", overflowY: "auto", overflowX: "hidden" }}>
        <Navegacion compacta={compactaVisual} />
      </Box>
    </SidebarWrapper>
  );
}

export function BarraLateralMovil() {
  const { sidebarMovilAbierta, cerrarSidebarMovil } = useLayout();
  return (
    <Drawer
      anchor="left"
      open={sidebarMovilAbierta}
      onClose={cerrarSidebarMovil}
      slotProps={{ paper: { sx: { width: ANCHO_BARRA_LATERAL, backgroundImage: "none" } } }}
    >
      <Box sx={{ height: 70, px: 3.5, display: "flex", alignItems: "center" }}>
        <UkoLogo />
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <Navegacion compacta={false} onNavegar={cerrarSidebarMovil} />
      </Box>
    </Drawer>
  );
}
