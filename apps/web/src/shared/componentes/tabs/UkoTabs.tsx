import type { ReactElement, ReactNode, SyntheticEvent } from "react";
import { Box, Stack, Tab, Tabs, type BoxProps, type TabsProps } from "@mui/material";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";

type UkoTabTone = "neutral" | "info" | "warning" | "success" | "error";

export interface UkoTabItem<TValue extends string | number> {
  value: TValue;
  label: ReactNode;
  count?: number;
  icon?: ReactElement;
  disabled?: boolean;
  tone?: UkoTabTone;
  groupStart?: boolean;
}

interface UkoTabsProps<TValue extends string | number>
  extends Omit<TabsProps, "children" | "onChange" | "value"> {
  value: TValue;
  items: readonly UkoTabItem<TValue>[];
  onChange: (value: TValue) => void;
  idPrefix?: string;
}

export function UkoTabs<TValue extends string | number>({
  value,
  items,
  onChange,
  idPrefix = "uko-tab",
  variant = "scrollable",
  scrollButtons = "auto",
  sx,
  ...tabsProps
}: UkoTabsProps<TValue>) {
  const handleChange = (_event: SyntheticEvent, nextValue: TValue) => onChange(nextValue);
  const activeTone = items.find((item) => item.value === value)?.tone ?? "neutral";
  const mergedSx = [
    {
      "& .MuiTabs-list, & .MuiTabs-flexContainer": {
        gap: { xs: 2, sm: 3 },
      },
      "& .MuiTab-root": {
        minWidth: "max-content",
        flexShrink: 0,
        px: 0.5,
      },
      "& .MuiTabs-indicator": {
        bgcolor: activeTone === "neutral" ? "primary.main" : `${activeTone}.main`,
      },
    },
    ...(Array.isArray(sx) ? sx : [sx]),
  ].filter(Boolean) as SxProps<Theme>;

  return (
    <Tabs
      {...tabsProps}
      value={value}
      onChange={handleChange}
      variant={variant}
      scrollButtons={scrollButtons}
      allowScrollButtonsMobile
      sx={mergedSx}
    >
      {items.map((item) => {
        const tone = item.tone ?? "neutral";
        const colored = tone !== "neutral";

        return (
          <Tab
            key={item.value}
            id={`${idPrefix}-${item.value}`}
            aria-controls={`${idPrefix}-panel-${item.value}`}
            value={item.value}
            disabled={item.disabled}
            icon={item.icon}
            iconPosition={item.icon ? "start" : undefined}
            sx={{
              ...(item.groupStart && {
                ml: { xs: 1, sm: 2 },
                pl: { xs: 2, sm: 3 },
                borderLeft: "1px solid",
                borderColor: "divider",
              }),
              ...(colored && {
                color: `${tone}.main`,
                opacity: 0.78,
                "&.Mui-selected": { color: `${tone}.main`, opacity: 1 },
              }),
            }}
            label={
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <Box component="span">{item.label}</Box>
                {item.count !== undefined && (
                  <Box
                    component="span"
                    sx={(theme) => ({
                      minWidth: 22,
                      height: 22,
                      px: 0.75,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 11,
                      bgcolor: colored
                        ? alpha(theme.palette[tone].main, 0.14)
                        : theme.palette.action.selected,
                      color: colored ? theme.palette[tone].main : theme.palette.text.secondary,
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1,
                    })}
                  >
                    {item.count.toLocaleString("es-CL")}
                  </Box>
                )}
              </Stack>
            }
          />
        );
      })}
    </Tabs>
  );
}

interface UkoTabPanelProps<TValue extends string | number> extends BoxProps {
  value: TValue;
  activeValue: TValue;
  idPrefix?: string;
  keepMounted?: boolean;
  children: ReactNode;
}

export function UkoTabPanel<TValue extends string | number>({
  value,
  activeValue,
  idPrefix = "uko-tab",
  keepMounted = false,
  children,
  ...boxProps
}: UkoTabPanelProps<TValue>) {
  const active = value === activeValue;
  if (!active && !keepMounted) return null;

  return (
    <Box
      {...boxProps}
      role="tabpanel"
      hidden={!active}
      id={`${idPrefix}-panel-${value}`}
      aria-labelledby={`${idPrefix}-${value}`}
    >
      {children}
    </Box>
  );
}
