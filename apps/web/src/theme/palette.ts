import { alpha, type PaletteMode, type PaletteOptions } from "@mui/material/styles";

export const grey = {
  25: "#F9FAFB",
  50: "#F6F7F8",
  100: "#F3F4F6",
  200: "#E5E7EB",
  300: "#D1D5DB",
  400: "#9CA3AF",
  500: "#6B7280",
  600: "#4B5563",
  700: "#374151",
  800: "#1F2937",
  900: "#111827",
} as const;

export const primary = {
  25: "#FAFAFF",
  50: "#F4F4FF",
  100: "#EAEAFE",
  200: "#D4D4FE",
  300: "#B9B9FD",
  400: "#9D9DFC",
  500: "#8282FB",
  600: "#5151D3",
  700: "#5151D3",
  800: "#3D3DAA",
  900: "#2D2D85",
  main: "#6868EB",
} as const;

export const success = {
  25: "#F0FDF5",
  50: "#DCFCE8",
  100: "#BBF7D1",
  200: "#86EFAD",
  300: "#4ADE80",
  400: "#22C55E",
  500: "#16A34A",
  600: "#15803D",
  700: "#166534",
  800: "#14532D",
  900: "#052E16",
  main: "#22C55E",
} as const;

export const warning = {
  25: "#FFFBEB",
  50: "#FEF3C7",
  100: "#FDE68A",
  200: "#FCD34D",
  300: "#FBBF24",
  400: "#F59E0B",
  500: "#D97706",
  600: "#B45309",
  700: "#92400E",
  800: "#78350F",
  900: "#451A03",
  main: "#F59E0B",
} as const;

export const error = {
  25: "#FEF2F2",
  50: "#FEE2E2",
  100: "#FECACA",
  200: "#FCA5A5",
  300: "#F87171",
  400: "#EF4444",
  500: "#DC2626",
  600: "#B91C1C",
  700: "#991B1B",
  800: "#7F1D1D",
  900: "#450A0A",
  main: "#EF4444",
} as const;

const secondary = { ...grey, main: grey[50] };
const info = { light: primary[100], main: primary[500], dark: primary[600] };

export function createUkoPalette(mode: PaletteMode): PaletteOptions {
  const dark = mode === "dark";

  return {
    mode,
    grey,
    primary: { ...primary },
    secondary,
    success: { ...success },
    warning: { ...warning },
    error: { ...error },
    info,
    text: dark
      ? { primary: grey[25], disabled: grey[400], secondary: grey[300] }
      : { primary: grey[900], disabled: grey[300], secondary: grey[500] },
    divider: dark ? grey[800] : grey[200],
    action: dark
      ? {
          focusOpacity: 0.12,
          hoverOpacity: 0.08,
          selected: grey[800],
          disabledOpacity: 0.38,
          selectedOpacity: 0.16,
          activatedOpacity: 0.24,
          disabled: grey[600],
          focus: alpha(grey[100], 0.12),
          hover: alpha(grey[100], 0.08),
          active: alpha(grey[100], 0.54),
          disabledBackground: alpha(grey[100], 0.12),
        }
      : {
          focusOpacity: 0.12,
          hoverOpacity: 0.04,
          selected: grey[50],
          disabled: grey[300],
          disabledOpacity: 0.38,
          selectedOpacity: 0.08,
          activatedOpacity: 0.12,
          focus: alpha(grey[900], 0.12),
          hover: alpha(grey[900], 0.04),
          active: alpha(grey[900], 0.54),
          disabledBackground: alpha(grey[900], 0.12),
        },
    background: dark
      ? { paper: grey[900], default: "#0D1117" }
      : { paper: "#FFFFFF", default: grey[25] },
  };
}
