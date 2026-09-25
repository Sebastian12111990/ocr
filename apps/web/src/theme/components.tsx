import CheckCircle from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import Info from "@mui/icons-material/Info";
import WarningIcon from "@mui/icons-material/Warning";
import { alpha, type Components, type Theme } from "@mui/material/styles";
import { createSvgIcon } from "@mui/material/utils";

import { error, grey, primary, success, warning } from "./palette";

const BlankCheckBoxIcon = createSvgIcon(
  <path d="M17 3a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4h10zm0 2H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2z" />,
  "BlankCheckBoxIcon",
);

const CheckBoxIcon = createSvgIcon(
  <path d="M17 3a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4h10zm-1.372 4.972a1.006 1.006 0 00-.928.388l-3.78 5-1.63-2.08a1.001 1.001 0 00-1.58 1.23l2.44 3.11a1 1 0 001.58-.01l4.57-6v-.03a1.006 1.006 0 00-.672-1.608z" />,
  "CheckBoxIcon",
);

const CheckboxIndeterminateIcon = createSvgIcon(
  <path d="M17 3a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4h10zm-1.75 8h-6.5a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75h6.5a.75.75 0 00.75-.75v-.5a.75.75 0 00-.75-.75z" />,
  "CheckboxIndeterminateIcon",
);

const standardAlert = (color: { main: string; 50: string }, dark: boolean) => ({
  color: color.main,
  backgroundColor: dark ? alpha(color.main, 0.1) : color[50],
});

const outlinedAlert = (color: { main: string; 50: string }, dark: boolean) => ({
  ...standardAlert(color, dark),
  borderColor: color.main,
});

export function createUkoComponents(theme: Theme): Components<Theme> {
  const dark = theme.palette.mode === "dark";

  return {
    MuiCssBaseline: {
      styleOverrides: {
        "*": {
          margin: 0,
          padding: 0,
          boxSizing: "border-box",
          scrollBehavior: "smooth",
          scrollbarWidth: "thin",
          scrollbarColor: `${alpha(grey[500], 0.55)} transparent`,
        },
        "*::-webkit-scrollbar": { width: 10, height: 10 },
        "*::-webkit-scrollbar-track": { backgroundColor: "transparent" },
        "*::-webkit-scrollbar-thumb": {
          minHeight: 28,
          backgroundColor: alpha(grey[500], 0.55),
          backgroundClip: "padding-box",
          border: "3px solid transparent",
          borderRadius: 8,
        },
        html: {
          width: "100%",
          height: "100%",
          WebkitOverflowScrolling: "touch",
          MozOsxFontSmoothing: "grayscale",
        },
        body: { width: "100%", height: "100%", "--bprogress-color": primary.main },
        a: { color: primary.main, textDecoration: "none" },
        "input[type=number]": {
          MozAppearance: "textfield",
          "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
            margin: 0,
            WebkitAppearance: "none",
          },
        },
        "#root": { width: "100%", height: "100%" },
      },
    },
    MuiAppBar: {
      defaultProps: { color: "transparent" },
      styleOverrides: { root: { boxShadow: "none" } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiCard: {
      defaultProps: { elevation: 1 },
      styleOverrides: { root: { borderRadius: 12, backgroundImage: "none" } },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: "transparent",
          background: `linear-gradient(90deg, ${alpha(grey[600], 0.8)} 0%, ${alpha(grey[700], 0.4)} 100%)`,
        },
        invisible: { background: "transparent" },
      },
    },
    MuiButtonBase: {
      styleOverrides: { root: { fontFamily: theme.typography.fontFamily } },
    },
    MuiButton: {
      defaultProps: { color: "primary", variant: "contained" },
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 10,
          color: "inherit",
          boxShadow: "none",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textTransform: "none",
          textOverflow: "ellipsis",
          "&.Mui-disabled": { color: grey[400] },
        },
        contained: {
          color: "white",
          "&:hover": { boxShadow: "none" },
          "&.Mui-disabled": { backgroundColor: dark ? grey[600] : grey[200] },
        },
        containedPrimary: { "&:hover": { backgroundColor: primary[600] } },
        containedSuccess: { "&:hover": { backgroundColor: success[700] } },
        containedWarning: { "&:hover": { backgroundColor: warning[500] } },
        containedError: { "&:hover": { backgroundColor: error[600] } },
        containedSecondary: {
          transition: "none",
          color: theme.palette.text.primary,
          backgroundColor: dark ? grey[700] : grey[50],
          "&:hover": { backgroundColor: dark ? grey[600] : grey[200] },
        },
        containedInherit: {
          color: dark ? "black" : "white",
          backgroundColor: theme.palette.text.primary,
          "&:hover": { backgroundColor: alpha(theme.palette.text.primary, 0.9) },
        },
        outlinedPrimary: { color: primary.main },
        outlinedSuccess: { color: success.main },
        outlinedWarning: { color: warning.main },
        outlinedError: { color: error.main },
        outlinedSecondary: { transition: "none", borderColor: theme.palette.divider },
        textPrimary: { color: primary.main },
        textSecondary: { color: grey[600] },
        textSuccess: { color: success.main },
        textWarning: { color: warning.main },
        textError: { color: error.main },
        sizeSmall: { padding: "0.25rem 0.5rem", height: 30, lineHeight: 1.5 },
        sizeMedium: { padding: "6px 14px" },
        sizeLarge: { padding: "8px 16px", height: 48 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        colorSecondary: { color: grey[400], "&:hover": { color: primary.main } },
      },
    },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiInput: {
      styleOverrides: { root: { "&:before": { borderColor: grey[400] } } },
    },
    MuiInputLabel: {
      styleOverrides: {
        sizeSmall: { fontSize: 14, lineHeight: 1.9 },
        standard: { fontWeight: 500 },
        filled: {
          fontWeight: 500,
          "&.Mui-focused": { fontWeight: 600 },
          "&.Mui-disabled": { color: grey[300] },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: { color: theme.palette.text.primary },
        adornedEnd: { color: grey[400] },
        adornedStart: { color: grey[400] },
        inputSizeSmall: { padding: "12px 14px" },
        sizeSmall: { fontSize: 14, fontWeight: 400 },
        notchedOutline: { borderRadius: 8, borderColor: dark ? grey[700] : grey[200] },
      },
    },
    MuiFilledInput: {
      defaultProps: { disableUnderline: true },
      styleOverrides: {
        root: ({ ownerState }: { ownerState: { color?: string; error?: boolean } }) => {
          const background = ownerState.error
            ? dark
              ? alpha(error[900], 0.2)
              : error[50]
            : dark
              ? grey[800]
              : grey[100];
          return {
            borderRadius: 8,
            border: "1px solid transparent",
            backgroundColor: background,
            transition: "background-color 200ms cubic-bezier(0, 0, .2, 1), box-shadow 200ms cubic-bezier(.4, 0, .2, 1)",
            "&:hover": { backgroundColor: background },
            "&.Mui-disabled": { backgroundColor: dark ? grey[400] : grey[200] },
            "&.Mui-focused": {
              backgroundColor: background,
              ...(ownerState.color === "primary" && {
                border: `1px solid ${ownerState.error ? error.main : primary.main}`,
                boxShadow: `${ownerState.error ? error.main : primary.main} 0 0 0 1px`,
              }),
            },
          };
        },
        sizeSmall: { fontSize: 14, fontWeight: 400 },
      },
    },
    MuiAlert: {
      defaultProps: {
        iconMapping: {
          info: <Info />,
          error: <ErrorIcon />,
          success: <CheckCircle />,
          warning: <WarningIcon />,
        },
      },
      styleOverrides: {
        root: { borderRadius: 12, fontSize: 12, fontWeight: 600, alignItems: "center" },
        standardInfo: { ...standardAlert(primary, dark), "& .MuiAlert-icon": { color: primary.main } },
        standardError: standardAlert(error, dark),
        standardSuccess: standardAlert(success, dark),
        standardWarning: standardAlert(warning, dark),
        outlinedInfo: { ...outlinedAlert(primary, dark), "& .MuiAlert-icon": { color: primary.main } },
        outlinedError: outlinedAlert(error, dark),
        outlinedSuccess: outlinedAlert(success, dark),
        outlinedWarning: outlinedAlert(warning, dark),
        filledInfo: { color: "white", backgroundColor: primary.main },
        filledError: { color: "white" },
        filledSuccess: { color: "white", backgroundColor: success[600] },
        filledWarning: { color: "white" },
      },
    },
    MuiCheckbox: {
      defaultProps: {
        icon: <BlankCheckBoxIcon />,
        checkedIcon: <CheckBoxIcon />,
        indeterminateIcon: <CheckboxIndeterminateIcon />,
      },
      styleOverrides: {
        colorSecondary: { "&.Mui-checked": { color: grey[700] } },
      },
    },
    MuiChip: {
      defaultProps: { color: "primary" },
      styleOverrides: {
        root: { lineHeight: 1, fontWeight: 500, borderRadius: 16 },
        sizeSmall: { fontSize: 13 },
        filled: ({ ownerState }: { ownerState: { color?: string } }) => ({
          color: "white",
          ...(ownerState.color === "default" && { backgroundColor: grey[500] }),
        }),
        outlined: ({ ownerState }: { ownerState: { color?: string } }) => ({
          ...(ownerState.color === "default" && { color: grey[400] }),
        }),
        filledSecondary: {
          color: dark ? grey[50] : grey[700],
          backgroundColor: dark ? grey[700] : grey[100],
        },
        outlinedSecondary: { color: grey[700], borderColor: grey[700] },
        deleteIcon: { opacity: 0.8, fontSize: 18, "&:hover": { opacity: 1, color: "inherit" } },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 12 }, paperFullScreen: { borderRadius: 0 } },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { padding: 24, fontWeight: 600, paddingBottom: 16 } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { paddingBottom: 0 }, dividers: { display: "none" } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: 24 }, spacing: { gap: 12 } },
    },
    MuiPopover: {
      styleOverrides: { paper: { borderRadius: 12, boxShadow: theme.shadows[2] } },
    },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 8 } } },
    MuiMenuItem: {
      styleOverrides: { root: { fontSize: 14, borderRadius: 8, marginInline: 8 } },
    },
    MuiListItemText: { styleOverrides: { root: { margin: 0 }, multiline: { margin: 0 } } },
    MuiListItemIcon: {
      styleOverrides: { root: { marginRight: 12, minWidth: "auto", color: grey[600] } },
    },
    MuiTab: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          padding: 0,
          minHeight: 40,
          fontWeight: 400,
          minWidth: "auto",
          textTransform: "none",
          "&.Mui-selected": { fontWeight: 600 },
        },
        textColorSecondary: { "&.Mui-selected": { color: theme.palette.text.primary } },
        iconWrapper: { fontSize: "1.2rem" },
      },
    },
    MuiTabs: {
      styleOverrides: {
        flexContainer: { gap: "2rem" },
        list: { gap: "2rem" },
        scrollButtons: { "&.Mui-disabled": { opacity: 0.2 } },
        root: {
          minHeight: 45,
          borderBottom: `1px solid ${dark ? grey[700] : grey[100]}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 8, backgroundColor: dark ? grey[700] : theme.palette.text.primary },
        arrow: { color: dark ? grey[700] : theme.palette.text.primary },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        track: { borderRadius: 16, backgroundColor: grey[500] },
        switchBase: ({ ownerState }: { ownerState: { size?: string } }) => ({
          padding: ownerState.size === "small" ? "6px" : 11,
        }),
        root: ({ ownerState }: { ownerState: { size?: string } }) => ({
          padding: ownerState.size === "small" ? 3 : 8,
        }),
        thumb: ({ ownerState }: { ownerState: { size?: string } }) => ({
          width: ownerState.size === "small" ? 12 : 16,
          height: ownerState.size === "small" ? 12 : 16,
        }),
      },
    },
    MuiSlider: {
      styleOverrides: {
        valueLabel: { borderRadius: 8 },
        markLabel: { fontSize: 12, fontWeight: 500, color: grey[500] },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          flexGrow: 1,
          borderRadius: 16,
          backgroundColor: dark ? grey[700] : grey[200],
        },
      },
    },
    MuiTableCell: {
      defaultProps: { padding: "none" },
      styleOverrides: { root: { border: "none", color: dark ? grey[200] : grey[500] } },
    },
    MuiLink: {
      styleOverrides: { root: { fontSize: 14, fontWeight: 500, textDecoration: "none" } },
    },
    MuiSvgIcon: {
      styleOverrides: { root: { "& .secondary": { opacity: 0.4 } } },
    },
    MuiAccordion: {
      defaultProps: { elevation: 0, disableGutters: true },
      styleOverrides: {
        root: {
          overflow: "hidden",
          marginBottom: "1rem",
          border: `1px solid ${theme.palette.divider}`,
          transition: "all 150ms cubic-bezier(.4, 0, .2, 1)",
          "&:before": { display: "none" },
          "&:last-of-type": { marginBottom: 0 },
        },
        rounded: { borderRadius: "1rem" },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          fontSize: 14,
          fontWeight: 600,
          padding: "0 1.5rem",
          color: grey[400],
          transition: "all 150ms cubic-bezier(.4, 0, .2, 1)",
          "&.Mui-expanded": { color: dark ? grey[100] : grey[700] },
        },
        content: { alignItems: "center" },
        expandIconWrapper: { color: grey[400] },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: { fontSize: 14, paddingTop: 4, fontWeight: 400, paddingInline: 24, paddingBottom: 24, color: grey[400] },
      },
    },
    MuiBadge: {
      styleOverrides: {
        colorError: { color: "white" },
        colorSuccess: { color: "white" },
        colorWarning: { color: "white" },
        colorSecondary: { backgroundColor: grey[300] },
        dot: { minWidth: 10, height: 10, borderRadius: "50%" },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: { root: { color: "white", borderRadius: 12, backgroundColor: primary.main } },
    },
  } as Components<Theme>;
}
