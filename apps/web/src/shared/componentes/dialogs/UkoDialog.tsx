import type { ReactNode } from "react";
import { CloseOutlined } from "@mui/icons-material";
import {
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Tooltip,
  type DialogProps,
  type SxProps,
  type Theme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

interface UkoDialogProps extends Omit<DialogProps, "children" | "onClose" | "title" | "slotProps"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  contentSx?: SxProps<Theme>;
  onClose: () => void;
}

/** Diálogo base Uko con CardHeader, cierre, contenido y pie opcional. */
export function UkoDialog({
  title,
  subtitle,
  children,
  footer,
  contentSx,
  onClose,
  maxWidth = "md",
  fullWidth = true,
  ...props
}: UkoDialogProps) {
  return (
    <Dialog
      {...props}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: (theme) => alpha(theme.palette.common.black, 0.68),
            backdropFilter: "blur(5px)",
          },
        },
        paper: {
          sx: {
            maxHeight: "calc(100dvh - 32px)",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            backgroundImage: "none",
            overflow: "hidden",
          },
        },
      }}
    >
      {(title || subtitle) && (
        <CardHeader
          title={title}
          subheader={subtitle}
          action={
            <Tooltip title="Cerrar">
              <IconButton size="small" onClick={onClose} aria-label="Cerrar">
                <CloseOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          }
          sx={{
            px: 2.5,
            py: 1.75,
            borderBottom: "1px solid",
            borderColor: "divider",
            "& .MuiCardHeader-content": { minWidth: 0 },
            "& .MuiCardHeader-title": { fontSize: "1rem", fontWeight: 700 },
            "& .MuiCardHeader-subheader": { mt: 0.25 },
            "& .MuiCardHeader-action": { alignSelf: "center", m: 0 },
          }}
        />
      )}
      <DialogContent sx={contentSx}>{children}</DialogContent>
      {footer && (
        <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
          {footer}
        </DialogActions>
      )}
    </Dialog>
  );
}
