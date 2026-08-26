import { createTheme } from "@mui/material/styles";

/**
 * Adaptación liviana de la paleta de `uko-vite-js-4.1.0` (theme/colors.js):
 * mismo primary/success/error/warning y fondo gris muy claro, sin portar los
 * 36 overrides de componentes del template original (no se necesitan para
 * el editor).
 */
export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#6868EB" },
    success: { main: "#22C55E" },
    error: { main: "#EF4444" },
    warning: { main: "#F59E0B" },
    background: { default: "#0D1117", paper: "#161B22" },
    divider: "#30363D",
  },
  typography: {
    fontFamily: "'Public Sans', 'Segoe UI', Roboto, sans-serif",
  },
  shape: { borderRadius: 8 },
  components: {
    MuiTextField: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { size: "small" } },
  },
});
