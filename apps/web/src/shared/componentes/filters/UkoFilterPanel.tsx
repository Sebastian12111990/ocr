import type { ReactNode } from "react";
import { FilterAltOutlined } from "@mui/icons-material";
import { Box, Card, Stack, Typography } from "@mui/material";

interface UkoFilterPanelProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  minColumnWidth?: number;
  embedded?: boolean;
}

export function UkoFilterPanel({
  children,
  title = "Filtros",
  subtitle,
  actions,
  minColumnWidth = 170,
  embedded = false,
}: UkoFilterPanelProps) {
  const content = (
    <>
      <Stack direction="row" spacing={1.25} sx={{ mb: 2, alignItems: "center" }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            borderRadius: 2,
            color: "primary.main",
            bgcolor: "action.selected",
          }}
        >
          <FilterAltOutlined fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        {actions}
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumnWidth}px), 1fr))`,
          gap: 1.5,
          alignItems: "start",
          "& > *": { minWidth: 0 },
        }}
      >
        {children}
      </Box>
    </>
  );

  if (embedded) {
    return (
      <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
        {content}
      </Box>
    );
  }

  return (
    <Card sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
      {content}
    </Card>
  );
}
