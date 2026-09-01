import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Checkbox, IconButton, MenuItem, Slider, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import type { ParametroCatalogo } from "@/features/catalogo/catalogo.types";
import type { ValorParametro } from "../pipeline.types";

interface Props {
  parametro: ParametroCatalogo;
  valor: ValorParametro;
  onChange: (valor: ValorParametro) => void;
}

interface PropsNumero extends Props {
  parametro: ParametroCatalogo & { tipo: "number" };
  valor: number;
}

const PATRON_ENTERO = /^-?\d*$/;
const PATRON_DECIMAL = /^-?(?:\d+(?:[.,]\d*)?|[.,]\d*)?$/;

function ControlNumero({ parametro, valor, onChange }: PropsNumero) {
  const paso = parametro.paso ?? 1;
  const minimo = parametro.minimo ?? Number.NEGATIVE_INFINITY;
  const maximo = parametro.maximo ?? Number.POSITIVE_INFINITY;
  const permiteDecimales = !Number.isInteger(paso);
  const [entrada, setEntrada] = useState(String(valor));
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (!editando) setEntrada(String(valor));
  }, [editando, valor]);

  function convertir(texto: string): number | null {
    if (texto === "" || texto === "-" || texto === "." || texto === "," || texto === "-." || texto === "-,") {
      return null;
    }
    const convertido = Number(texto.replace(",", "."));
    return Number.isFinite(convertido) ? convertido : null;
  }

  function ajustar(numero: number): number {
    const limitado = Math.max(minimo, Math.min(maximo, numero));
    const origen = Number.isFinite(minimo) ? minimo : 0;
    const ajustadoAlPaso = paso > 0
      ? origen + Math.round((limitado - origen) / paso) * paso
      : limitado;
    return Number(Math.max(minimo, Math.min(maximo, ajustadoAlPaso)).toFixed(10));
  }

  function editar(texto: string): void {
    const patron = permiteDecimales ? PATRON_DECIMAL : PATRON_ENTERO;
    if (!patron.test(texto)) return;
    setEntrada(texto);
    const numero = convertir(texto);
    if (numero !== null && numero >= minimo && numero <= maximo) onChange(numero);
  }

  function confirmar(): void {
    const numero = convertir(entrada);
    const confirmado = numero === null ? valor : ajustar(numero);
    onChange(confirmado);
    setEntrada(String(confirmado));
    setEditando(false);
  }

  function desplazar(cantidad: number): void {
    onChange(ajustar(valor + cantidad * paso));
  }

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2">{parametro.etiqueta}</Typography>
        <TextField
          variant="standard"
          value={entrada}
          onFocus={() => setEditando(true)}
          onChange={(evento) => editar(evento.target.value)}
          onBlur={confirmar}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") evento.currentTarget.querySelector("input")?.blur();
            if (evento.key === "Escape") {
              setEntrada(String(valor));
              evento.currentTarget.querySelector("input")?.blur();
            }
          }}
          slotProps={{
            htmlInput: {
              inputMode: permiteDecimales ? "decimal" : "numeric",
              "aria-label": `Valor de ${parametro.etiqueta}`,
            },
          }}
          sx={{
            width: 76,
            flexShrink: 0,
            "& input": { py: 0.25, textAlign: "right", color: "text.secondary" },
          }}
        />
      </Stack>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <IconButton
          size="small"
          aria-label={`Disminuir ${parametro.etiqueta}`}
          disabled={valor <= minimo}
          onClick={() => desplazar(-1)}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <Slider
          size="small"
          value={valor}
          min={parametro.minimo}
          max={parametro.maximo}
          step={paso}
          onChange={(_evento, nuevoValor) => onChange(Array.isArray(nuevoValor) ? nuevoValor[0]! : nuevoValor)}
          sx={{ flex: 1 }}
        />
        <IconButton
          size="small"
          aria-label={`Aumentar ${parametro.etiqueta}`}
          disabled={valor >= maximo}
          onClick={() => desplazar(1)}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
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

  return (
    <ControlNumero
      parametro={parametro as ParametroCatalogo & { tipo: "number" }}
      valor={typeof valor === "number" && Number.isFinite(valor) ? valor : Number(parametro.defecto)}
      onChange={onChange}
    />
  );
}
