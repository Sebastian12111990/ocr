import type { ReactNode } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";
import { alpha, type Palette } from "@mui/material/styles";

type StatTone = "primary" | "success" | "warning" | "error" | "info";

interface UkoStatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: StatTone;
  highlighted?: boolean;
  caption?: string;
}

export function UkoStatCard({
  label,
  value,
  icon,
  tone = "primary",
  highlighted = false,
  caption,
}: UkoStatCardProps) {
  return (
    <Card
      sx={{
        minWidth: 175,
        flex: "1 1 175px",
        p: 2,
        border: "1px solid",
        borderColor: highlighted ? `${tone}.main` : "divider",
        boxShadow: highlighted ? (theme) => `0 0 0 1px ${alpha(theme.palette[tone].main, 0.2)}` : 1,
        backgroundColor: highlighted
          ? (theme) => alpha(theme.palette[tone].main, theme.palette.mode === "dark" ? 0.08 : 0.04)
          : "background.paper",
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {label}
          </Typography>
          <Typography
            variant="h5"
            sx={{ mt: 0.5, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
          >
            {typeof value === "number" ? value.toLocaleString("es-CL") : value}
          </Typography>
          {caption && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", mt: 0.5 }}>
              {caption}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 42,
            height: 42,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: 2.5,
            color: `${tone}.main`,
            bgcolor: (theme) => alpha((theme.palette[tone] as Palette[StatTone]).main, 0.12),
            "& .MuiSvgIcon-root": { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
      </Stack>
    </Card>
  );
}
