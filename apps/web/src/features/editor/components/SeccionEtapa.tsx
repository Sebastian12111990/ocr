import { type ReactNode, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Card, Collapse, IconButton, Stack, Switch, Typography } from "@mui/material";

import type { EtapaCatalogo } from "@/features/catalogo/catalogo.types";
import type { EtapaPipeline, ValorParametro } from "../pipeline.types";
import { ControlParametro } from "./ControlParametro";

interface Props {
  definicion: EtapaCatalogo;
  etapa: EtapaPipeline;
  onAlternarActiva: () => void;
  onCambiarParametro: (nombre: string, valor: ValorParametro) => void;
  accionesExtra?: ReactNode;
}

/** Botón ON/OFF que aplica la etapa + botón separado que despliega/esconde
 * sus propios controles — el mismo patrón que los botones de matplotlib del
 * script original. */
export function SeccionEtapa({ definicion, etapa, onAlternarActiva, onCambiarParametro, accionesExtra }: Props) {
  const [expandido, setExpandido] = useState(etapa.activa);
  const tieneParametros = definicion.parametros.length > 0;

  return (
    <Card variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Switch size="small" checked={etapa.activa} onChange={onAlternarActiva} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {definicion.etiqueta}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ alignItems: "center" }}>
          {accionesExtra}
          {tieneParametros && (
            <IconButton
              size="small"
              onClick={() => setExpandido((valor) => !valor)}
              sx={{ transform: expandido ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Stack>

      {tieneParametros && (
        <Collapse in={expandido}>
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {definicion.parametros.map((parametro) => (
              <ControlParametro
                key={parametro.nombre}
                parametro={parametro}
                valor={etapa.parametros[parametro.nombre] ?? parametro.defecto}
                onChange={(valor) => onCambiarParametro(parametro.nombre, valor)}
              />
            ))}
          </Stack>
        </Collapse>
      )}
    </Card>
  );
}
