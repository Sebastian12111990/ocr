import { MenuItem, Slider, Stack, Switch, TextField, Typography } from "@mui/material";

import type { ParametroCatalogo } from "@/features/catalogo/catalogo.types";
import type { ValorParametro } from "../pipeline.types";

interface Props {
  parametro: ParametroCatalogo;
  valor: ValorParametro;
  onChange: (valor: ValorParametro) => void;
}

/** Renderiza el control adecuado según `parametro.tipo`, sin un componente
 * por filtro: el catálogo es la única fuente de verdad sobre qué mostrar. */
export function ControlParametro({ parametro, valor, onChange }: Props) {
  if (parametro.tipo === "boolean") {
    return (
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2">{parametro.etiqueta}</Typography>
        <Switch
          size="small"
          checked={Boolean(valor)}
          onChange={(evento) => onChange(evento.target.checked)}
        />
      </Stack>
    );
  }

  if (parametro.tipo === "enum") {
    return (
      <TextField
        select
        size="small"
        label={parametro.etiqueta}
        value={valor as string}
        onChange={(evento) => onChange(evento.target.value)}
        fullWidth
      >
        {(parametro.opciones ?? []).map((opcion) => (
          <MenuItem key={opcion} value={opcion}>
            {opcion}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  const numero = typeof valor === "number" ? valor : Number(valor);
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="body2">{parametro.etiqueta}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {numero}
        </Typography>
      </Stack>
      <Slider
        size="small"
        value={numero}
        min={parametro.minimo}
        max={parametro.maximo}
        step={parametro.paso ?? 1}
        onChange={(_evento, nuevoValor) => onChange(Array.isArray(nuevoValor) ? nuevoValor[0]! : nuevoValor)}
      />
    </Stack>
  );
}
