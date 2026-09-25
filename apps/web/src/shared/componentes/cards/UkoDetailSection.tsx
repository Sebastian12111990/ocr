import type { ReactNode } from "react";
import { Box, Card, Typography, type SxProps, type Theme } from "@mui/material";

interface UkoDetailSectionProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

/** Superficie compacta para agrupar información relacionada dentro de paneles laterales. */
export function UkoDetailSection({ title, description, children, sx }: UkoDetailSectionProps) {
  return (
    <Card
      variant="outlined"
      sx={[
        {
          p: 1.5,
          borderRadius: 2.5,
          bgcolor: "action.hover",
          boxShadow: "none",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, lineHeight: 1.45 }}>
          {description}
        </Typography>
      )}
      <Box sx={{ mt: 1.25 }}>{children}</Box>
    </Card>
  );
}
