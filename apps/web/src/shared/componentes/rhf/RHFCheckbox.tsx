import type { FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";
import Checkbox, { type CheckboxProps } from "@mui/material/Checkbox";
import FormControlLabel, { type FormControlLabelProps } from "@mui/material/FormControlLabel";

type Props<TFieldValues extends FieldValues> = {
  name: Path<TFieldValues>;
  label: FormControlLabelProps["label"];
  checkboxProps?: Omit<CheckboxProps, "name" | "checked">;
} & Omit<FormControlLabelProps, "name" | "control" | "checked" | "label">;

export function RHFCheckbox<TFieldValues extends FieldValues>({
  name,
  label,
  checkboxProps,
  ...other
}: Props<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControlLabel
          control={<Checkbox {...checkboxProps} {...field} checked={!!field.value} />}
          label={label}
          {...other}
        />
      )}
    />
  );
}
