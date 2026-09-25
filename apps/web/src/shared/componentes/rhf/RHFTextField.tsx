import type { FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { mergeSx, sxCampoRhf } from "./estilos";

type Props<TFieldValues extends FieldValues> = {
  name: Path<TFieldValues>;
  /** Se llama después de cada field.onChange (ej. disparar una búsqueda dependiente). */
  onChangeExtra?: () => void;
  /** Tope de caracteres para campos de texto (no aplica a type="number"). Sin valor, sin tope. */
  maxLength?: number;
} & Omit<TextFieldProps, "name" | "error">;

export function RHFTextField<TFieldValues extends FieldValues>({
  name,
  type,
  helperText,
  onChangeExtra,
  maxLength,
  sx,
  slotProps,
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
          type={type}
          value={field.value ?? ""}
          onChange={(evento) => {
            if (type === "number") {
              const valor = evento.target.value;
              field.onChange(valor === "" ? "" : Number(valor));
            } else {
              const valor = maxLength ? evento.target.value.slice(0, maxLength) : evento.target.value;
              field.onChange(valor);
            }
            onChangeExtra?.();
          }}
          fullWidth
          error={!!error}
          helperText={error ? error.message : helperText}
          slotProps={
            maxLength ? { ...slotProps, htmlInput: { maxLength, ...slotProps?.htmlInput } } : slotProps
          }
          {...other}
          sx={mergeSx(sxCampoRhf, sx)}
        />
      )}
    />
  );
}
