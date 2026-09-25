import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700.css";

import { useEffect, useMemo, type PropsWithChildren } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import {
  createTheme,
  responsiveFontSizes,
  ThemeProvider,
  type Theme,
  type ThemeOptions,
} from "@mui/material/styles";

import { createUkoComponents } from "./components";
import { createUkoPalette } from "./palette";
import { createUkoShadows } from "./shadows";
import {
  ThemeSettingsProvider,
  useThemeSettings,
  type ThemeSettings,
} from "./settings";

const baseOptions: ThemeOptions = {
  typography: {
    fontFamily: "'Public Sans', sans-serif",
    body1: { fontSize: 16 },
    body2: { fontSize: 14 },
    h1: { fontSize: 48, fontWeight: 700, lineHeight: 1.5 },
    h2: { fontSize: 40, fontWeight: 700, lineHeight: 1.5 },
    h3: { fontSize: 36, fontWeight: 700, lineHeight: 1.5 },
    h4: { fontSize: 32, fontWeight: 600 },
    h5: { fontSize: 28, fontWeight: 600, lineHeight: 1 },
    h6: { fontSize: 18, fontWeight: 500 },
  },
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  shape: { borderRadius: 8 },
};

export function createCustomTheme(settings: ThemeSettings): Theme {
  let theme = createTheme({
    ...baseOptions,
    direction: settings.direction,
    palette: createUkoPalette(settings.theme),
  });

  theme.shadows = createUkoShadows(theme);
  // MUI 9 expone internamente BaseTheme en esta propiedad, aunque los
  // callbacks reciben el Theme completo en tiempo de ejecución.
  theme.components = createUkoComponents(theme) as unknown as typeof theme.components;

  if (settings.responsiveFontSizes) theme = responsiveFontSizes(theme);
  return theme;
}

function UkoThemeBridge({ children }: PropsWithChildren) {
  const { settings } = useThemeSettings();
  const theme = useMemo(() => createCustomTheme(settings), [settings]);

  useEffect(() => {
    document.documentElement.dir = settings.direction;
    document.documentElement.style.colorScheme = settings.theme;
  }, [settings.direction, settings.theme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export function UkoThemeProvider({ children }: PropsWithChildren) {
  return (
    <ThemeSettingsProvider>
      <UkoThemeBridge>{children}</UkoThemeBridge>
    </ThemeSettingsProvider>
  );
}

export { useThemeSettings } from "./settings";
