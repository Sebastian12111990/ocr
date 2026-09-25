import type { FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";
import TextField, { type TextFieldProps } from "@mui/material/TextField";

import { mergeSx, sxCampoRhf } from "./estilos";

type Props<TFieldValues extends FieldValues> = {
  name: Path<TFieldValues>;
} & Omit<TextFieldProps, "name" | "error" | "select">;

export function RHFSelect<TFieldValues extends FieldValues>({
  name,
  children,
  helperText,
  sx,
  ...other
}: Props<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          select
          fullWidth
          error={!!error}
          helperText={error ? error.message : helperText}
          {...other}
          sx={mergeSx(sxCampoRhf, sx)}
        >
          {children}
        </TextField>
      )}
    />
  );
}
