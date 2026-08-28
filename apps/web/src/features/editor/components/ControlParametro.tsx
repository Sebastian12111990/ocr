import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Checkbox, IconButton, MenuItem, Slider, Stack, TextField, Typography } from "@mui/material";

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
        <Checkbox
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
  const paso = parametro.paso ?? 1;
  const minimo = parametro.minimo ?? Number.NEGATIVE_INFINITY;
  const maximo = parametro.maximo ?? Number.POSITIVE_INFINITY;

  function desplazar(cantidad: number): void {
    const nuevoValor = Math.max(minimo, Math.min(maximo, numero + cantidad * paso));
    onChange(Number(nuevoValor.toFixed(10)));
  }

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="body2">{parametro.etiqueta}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {numero}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <IconButton
          size="small"
          aria-label={`Disminuir ${parametro.etiqueta}`}
          disabled={numero <= minimo}
          onClick={() => desplazar(-1)}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <Slider
          size="small"
          value={numero}
          min={parametro.minimo}
          max={parametro.maximo}
          step={paso}
          onChange={(_evento, nuevoValor) => onChange(Array.isArray(nuevoValor) ? nuevoValor[0]! : nuevoValor)}
          sx={{ flex: 1 }}
        />
        <IconButton
          size="small"
          aria-label={`Aumentar ${parametro.etiqueta}`}
          disabled={numero >= maximo}
          onClick={() => desplazar(1)}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
}
