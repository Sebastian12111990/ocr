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
    MuiCssBaseline: {
      styleOverrides: {
        "*": {
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(139, 148, 158, 0.5) transparent",
          "&::-webkit-scrollbar": {
            width: 10,
            height: 10,
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            minHeight: 28,
            backgroundColor: "rgba(139, 148, 158, 0.5)",
            backgroundClip: "padding-box",
            border: "3px solid transparent",
            borderRadius: 8,
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "rgba(177, 186, 196, 0.72)",
          },
          "&::-webkit-scrollbar-corner": {
            backgroundColor: "transparent",
          },
        },
      },
    },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { size: "small" } },
  },
});
