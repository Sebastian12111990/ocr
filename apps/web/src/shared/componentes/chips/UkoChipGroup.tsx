import type { ReactNode } from "react";
import { Box, type BoxProps } from "@mui/material";

interface UkoChipGroupProps extends Omit<BoxProps, "children"> {
  children: ReactNode;
  columnGap?: number;
  rowGap?: number;
}

/** Grupo Uko para chips con separación consistente al envolver líneas. */
export function UkoChipGroup({
  children,
  columnGap = 1,
  rowGap = 1.25,
  sx,
  ...props
}: UkoChipGroupProps) {
  return (
    <Box
      {...props}
      sx={[
        {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          columnGap,
          rowGap,
          "& .MuiChip-root": { m: 0, flexShrink: 0 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
