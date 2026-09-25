import type { ReactNode } from "react";
import { Alert, AlertTitle, alpha, type AlertColor, type AlertProps } from "@mui/material";

interface UkoAlertProps extends Omit<AlertProps, "children" | "severity" | "title"> {
  severity?: AlertColor;
  title?: ReactNode;
  children: ReactNode;
}

export function UkoAlert({ severity = "info", title, children, sx, ...props }: UkoAlertProps) {
  return (
    <Alert
      {...props}
      severity={severity}
      variant="standard"
      sx={{
        border: "1px solid",
        borderColor: (theme) => alpha(theme.palette[severity].main, 0.28),
        backgroundColor: (theme) => alpha(theme.palette[severity].main, theme.palette.mode === "dark" ? 0.08 : 0.06),
        "& .MuiAlert-message": { width: "100%" },
        ...sx,
      }}
    >
      {title && <AlertTitle sx={{ mb: 0.25, fontSize: 13, fontWeight: 700 }}>{title}</AlertTitle>}
      {children}
    </Alert>
  );
}
