import DeleteIcon from "@mui/icons-material/Delete";
import { Box, IconButton, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";

import type { RespuestaCatalogo } from "@/features/catalogo/catalogo.types";
import type { ModoPipeline } from "../pipeline.types";
import type { usePipeline } from "../usePipeline";
import { SeccionEtapa } from "./SeccionEtapa";

interface Props {
  catalogo: RespuestaCatalogo;
  pipeline: ReturnType<typeof usePipeline>;
}

export function PanelControles({ catalogo, pipeline }: Props) {
  const { modo, setModo, etapas, alternarActiva, actualizarParametro, agregarEtapa, quitarEtapa, reordenar } =
    pipeline;

  function definicionDe(tipo: string) {
    return catalogo.etapas.find((definicion) => definicion.tipo === tipo);
  }

  function alManejarArrastre(resultado: DropResult): void {
    if (!resultado.destination) return;
    reordenar(resultado.source.index, resultado.destination.index);
  }

  return (
    <Stack spacing={2} sx={{ height: "100%", overflowY: "auto", p: 2 }}>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={modo}
        onChange={(_evento, valor: ModoPipeline | null) => valor && setModo(valor)}
      >
        <ToggleButton value="fijo">Modo fijo</ToggleButton>
        <ToggleButton value="libre">Modo libre</ToggleButton>
      </ToggleButtonGroup>

      {modo === "libre" && (
        <TextField
          select
          size="small"
          label="Agregar etapa"
          value=""
          onChange={(evento) => {
            const definicion = definicionDe(evento.target.value);
            if (definicion) agregarEtapa(definicion);
          }}
          fullWidth
        >
          {catalogo.etapas.map((definicion) => (
            <MenuItem key={definicion.tipo} value={definicion.tipo}>
              {definicion.etiqueta}
            </MenuItem>
          ))}
        </TextField>
      )}

      {modo === "fijo" ? (
        <Stack spacing={1.5}>
          {etapas.map((etapa, indice) => {
            const definicion = definicionDe(etapa.tipo);
            if (!definicion) return null;
            return (
              <SeccionEtapa
                key={etapa.tipo}
                definicion={definicion}
                etapa={etapa}
                onAlternarActiva={() => alternarActiva(indice)}
                onCambiarParametro={(nombre, valor) => actualizarParametro(indice, nombre, valor)}
              />
            );
          })}
        </Stack>
      ) : (
        <DragDropContext onDragEnd={alManejarArrastre}>
          <Droppable droppableId="etapas-libres">
            {(provisto) => (
              <Stack spacing={1.5} ref={provisto.innerRef} {...provisto.droppableProps}>
                {etapas.map((etapa, indice) => {
                  const definicion = definicionDe(etapa.tipo);
                  if (!definicion) return null;
                  return (
                    <Draggable key={`${etapa.tipo}-${indice}`} draggableId={`${etapa.tipo}-${indice}`} index={indice}>
                      {(provistoArrastre) => (
                        <Box
                          ref={provistoArrastre.innerRef}
                          {...provistoArrastre.draggableProps}
                          {...provistoArrastre.dragHandleProps}
                        >
                          <SeccionEtapa
                            definicion={definicion}
                            etapa={etapa}
                            onAlternarActiva={() => alternarActiva(indice)}
                            onCambiarParametro={(nombre, valor) => actualizarParametro(indice, nombre, valor)}
                            accionesExtra={
                              <IconButton size="small" onClick={() => quitarEtapa(indice)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            }
                          />
                        </Box>
                      )}
                    </Draggable>
                  );
                })}
                {provisto.placeholder}
                {etapas.length === 0 && (
                  <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
                    Agrega etapas desde el selector de arriba.
                  </Typography>
                )}
              </Stack>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </Stack>
  );
}
