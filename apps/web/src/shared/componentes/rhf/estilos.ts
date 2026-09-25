import type { SxProps, Theme } from "@mui/material/styles";

export function mergeSx(...valores: (SxProps<Theme> | undefined)[]): SxProps<Theme> {
  return valores.filter((valor): valor is SxProps<Theme> => valor != null) as SxProps<Theme>;
}

// El tema es oscuro y el variant por defecto (outlined) no tiene relleno — sin esto, los
// campos casi no se distinguen del fondo del header (background.paper) y sus íconos
// (flecha del select, clear/popup del autocomplete) quedan con bajo contraste.
export const sxCampoRhf: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "action.hover",
  },
  "& .MuiSvgIcon-root": {
    color: "text.secondary",
  },
};
