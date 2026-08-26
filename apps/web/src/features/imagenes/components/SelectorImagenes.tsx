import { MenuItem, TextField } from "@mui/material";

import { useListarImagenesQuery } from "../imagenesApi";

interface Props {
  imagenId: string | null;
  onChange: (id: string) => void;
}

export function SelectorImagenes({ imagenId, onChange }: Props) {
  const { data: imagenes = [], isLoading } = useListarImagenesQuery();

  return (
    <TextField
      select
      label="Patente"
      value={imagenId ?? ""}
      onChange={(evento) => onChange(evento.target.value)}
      disabled={isLoading}
      fullWidth
    >
      {imagenes.map((imagen) => (
        <MenuItem key={imagen.id} value={imagen.id}>
          {imagen.nombreArchivo}
          {imagen.patenteEsperada ? ` — ${imagen.patenteEsperada}` : ""}
        </MenuItem>
      ))}
    </TextField>
  );
}
