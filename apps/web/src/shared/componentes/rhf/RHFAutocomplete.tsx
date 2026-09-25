import type { FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { SxProps, Theme } from "@mui/material/styles";
 
export interface OpcionAutocomplete {
  code?: string | number;
  name?: string;
}

type Props<TFieldValues extends FieldValues, TOption extends OpcionAutocomplete> = {
  name: Path<TFieldValues>;
  label?: string;
  helperText?: string;
  options: TOption[];
  disabled?: boolean;
  className?: string;
  /** true: etiqueta "code - name"; false (default): solo "name". Ignorado si se pasa getOptionLabel. */
  concat?: boolean;
  getOptionLabel?: (opcion: TOption) => string;
  handleChange?: (valor: TOption | null) => void;
  sx?: SxProps<Theme>;
};

export function RHFAutocomplete<TFieldValues extends FieldValues, TOption extends OpcionAutocomplete>({
  name,
  label,
  helperText,
  options,
  disabled,
  className,
  concat = false,
  getOptionLabel,
  handleChange,
  sx,
}: Props<TFieldValues, TOption>) {
  const { control } = useFormContext<TFieldValues>();

  const obtenerEtiqueta =
    getOptionLabel ??
    ((opcion: TOption): string => {
      if (concat) return opcion.code != null && opcion.name ? `${opcion.code} - ${opcion.name}` : (opcion.name ?? "");
      return opcion.name ?? "";
    });

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Autocomplete
          className={className}
          value={(field.value as TOption | null) ?? null}
          options={options}
          getOptionLabel={obtenerEtiqueta}
          noOptionsText="No existe"
          isOptionEqualToValue={(opcion, valor) => opcion.code === valor.code}
          onChange={(_evento, valor) => {
            handleChange?.(valor);
            field.onChange(valor ?? null);
          }}
          onBlur={field.onBlur}
          disabled={disabled}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              disabled={disabled}
              error={!!error}
              helperText={error ? error.message : helperText}
              sx={sx}
            />
          )}
          sx={sx}
        />
      )}
    />
  );
}
