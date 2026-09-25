import { useState, type ReactNode } from "react";
import { ExpandLessOutlined, ExpandMoreOutlined } from "@mui/icons-material";
import {
  Box,
  Card,
  CardHeader,
  Collapse,
  IconButton,
  Stack,
  Tooltip,
  type CardProps,
  type SxProps,
  type Theme,
} from "@mui/material";

interface UkoSectionCardProps extends Omit<CardProps, "children" | "title"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  navigation?: ReactNode;
  children: ReactNode;
  contentSx?: SxProps<Theme>;
  headerSticky?: boolean;
  headerTop?: number | string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

/** Card Uko reutilizable para secciones con encabezado, navegación y contenido. */
export function UkoSectionCard({
  title,
  subtitle,
  actions,
  navigation,
  children,
  contentSx,
  headerSticky = false,
  headerTop = 0,
  collapsible = false,
  defaultExpanded = true,
  expanded: expandedProp,
  onExpandedChange,
  sx,
  ...props
}: UkoSectionCardProps) {
  const [expandedInternal, setExpandedInternal] = useState(defaultExpanded);
  const expanded = expandedProp ?? expandedInternal;
  const hasHeader = Boolean(title || subtitle || actions);
  const toggleExpanded = () => {
    const nextExpanded = !expanded;
    if (expandedProp === undefined) setExpandedInternal(nextExpanded);
    onExpandedChange?.(nextExpanded);
  };

  return (
    <Card
      {...props}
      sx={[
        {
          overflow: headerSticky ? "visible" : "hidden",
          border: "1px solid",
          borderColor: "divider",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {(hasHeader || navigation) && (
        <Box
          sx={{
            position: headerSticky ? "sticky" : "static",
            top: headerSticky ? headerTop : "auto",
            zIndex: headerSticky ? 2 : "auto",
            bgcolor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
            borderTopLeftRadius: "inherit",
            borderTopRightRadius: "inherit",
          }}
        >
          {hasHeader && (
            <CardHeader
              title={title}
              subheader={subtitle}
              onClick={collapsible ? toggleExpanded : undefined}
              action={
                (actions || collapsible) && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {actions}
                    {collapsible && (
                      <Tooltip title={expanded ? "Contraer" : "Expandir"}>
                        <IconButton
                          size="small"
                          aria-label={expanded ? "Contraer sección" : "Expandir sección"}
                          aria-expanded={expanded}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleExpanded();
                          }}
                        >
                          {expanded ? <ExpandLessOutlined /> : <ExpandMoreOutlined />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                )
              }
              sx={{
                px: 2,
                py: 1.5,
                cursor: collapsible ? "pointer" : "default",
                "& .MuiCardHeader-title": { fontSize: "1rem", fontWeight: 700 },
                "& .MuiCardHeader-subheader": { fontSize: "0.75rem" },
                "& .MuiCardHeader-action": { alignSelf: "center", m: 0 },
              }}
            />
          )}
          {navigation && <Box sx={{ px: 2, mt: hasHeader ? -0.5 : 0 }}>{navigation}</Box>}
        </Box>
      )}
      <Collapse in={!collapsible || expanded} timeout="auto">
        <Box sx={contentSx}>{children}</Box>
      </Collapse>
    </Card>
  );
}
