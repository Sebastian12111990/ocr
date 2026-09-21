import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  ListSubheader,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";

import type { EtapaCatalogo, RespuestaCatalogo } from "@/features/catalogo/catalogo.types";
import type { ModoPipeline } from "../pipeline.types";
import type { EtapaPipeline } from "../pipeline.types";
import type { usePipeline } from "../usePipeline";
import { AyudaEtapa } from "./AyudaEtapa";
import { SeccionEtapa } from "./SeccionEtapa";

interface Props {
  catalogo: RespuestaCatalogo;
  pipeline: ReturnType<typeof usePipeline>;
  imagenId: string | null;
  onCambiarImagen: (imagenId: string | null) => void;
}

interface BorradorPipeline {
  id: string;
  nombre: string;
  etapas: EtapaPipeline[];
  imagenId?: string | null;
  actualizadoEn: string;
}

const CLAVE_BORRADORES = "ocr.pipeline.borradores.v1";
export const ANCHO_PANEL_CONTROLES = 440;

const CATEGORIAS_ETAPAS = [
  { id: "color", etiqueta: "Color y canales" },
  { id: "suavizado", etiqueta: "Suavizado y reducción de ruido" },
  { id: "umbral", etiqueta: "Umbralización" },
  { id: "morfologia", etiqueta: "Morfología" },
  { id: "bordes", etiqueta: "Bordes y gradientes" },
  { id: "contornos", etiqueta: "Contornos y regiones" },
  { id: "esquinas", etiqueta: "Esquinas y puntos de interés" },
  { id: "transformacion", etiqueta: "Transformaciones geométricas" },
] as const;

function agruparEtapas(etapas: EtapaCatalogo[]) {
  const conocidas = CATEGORIAS_ETAPAS.map((categoria) => ({
    ...categoria,
    etapas: etapas.filter((etapa) => etapa.categoria === categoria.id),
  })).filter((categoria) => categoria.etapas.length > 0);

  const idsConocidos = new Set<string>(CATEGORIAS_ETAPAS.map((categoria) => categoria.id));
  const desconocidas = [...new Set(
    etapas.filter((etapa) => !idsConocidos.has(etapa.categoria)).map((etapa) => etapa.categoria),
  )].sort().map((id) => ({
    id,
    etiqueta: id,
    etapas: etapas.filter((etapa) => etapa.categoria === id),
  }));

  return [...conocidas, ...desconocidas];
}

function cargarBorradores(): BorradorPipeline[] {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(CLAVE_BORRADORES) ?? "[]");
    return Array.isArray(valor) ? (valor as BorradorPipeline[]) : [];
  } catch {
    return [];
  }
}

export function PanelControles({ catalogo, pipeline, imagenId, onCambiarImagen }: Props) {
  const [mostrarBorrador, setMostrarBorrador] = useState(false);
  const [nombreBorrador, setNombreBorrador] = useState("");
  const [borradores, setBorradores] = useState<BorradorPipeline[]>(cargarBorradores);
  const categoriasEtapas = agruparEtapas(catalogo.etapas);
  const {
    modo,
    setModo,
    etapas,
    etapasLibre,
    identidadesEtapasLibre,
    alternarActiva,
    actualizarParametro,
    agregarEtapa,
    quitarEtapa,
    cargarEtapasLibres,
    reordenar,
  } = pipeline;

  function persistirBorradores(nuevos: BorradorPipeline[]): void {
    setBorradores(nuevos);
    try {
      localStorage.setItem(CLAVE_BORRADORES, JSON.stringify(nuevos));
    } catch {
      // La interfaz sigue funcionando aunque el navegador bloquee localStorage.
    }
  }

  function guardarBorrador(): void {
    const nombre = nombreBorrador.trim() || `Borrador ${borradores.length + 1}`;
    const existente = borradores.find((borrador) => borrador.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase());
    const copiaEtapas = etapasLibre.map((etapa) => ({ ...etapa, parametros: { ...etapa.parametros } }));
    const nuevo: BorradorPipeline = {
      id: existente?.id ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      nombre,
      etapas: copiaEtapas,
      imagenId,
      actualizadoEn: new Date().toISOString(),
    };
    persistirBorradores(existente
      ? borradores.map((borrador) => (borrador.id === existente.id ? nuevo : borrador))
      : [nuevo, ...borradores]);
    setNombreBorrador("");
  }

  function eliminarBorrador(id: string): void {
    const borrador = borradores.find((item) => item.id === id);
    if (!borrador || !window.confirm(`¿Eliminar el borrador "${borrador.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    persistirBorradores(borradores.filter((borrador) => borrador.id !== id));
  }

  function definicionDe(tipo: string) {
    return catalogo.etapas.find((definicion) => definicion.tipo === tipo);
  }

  function alManejarArrastre(resultado: DropResult): void {
    if (!resultado.destination) return;
    reordenar(resultado.source.index, resultado.destination.index);
  }

  return (
    <Stack spacing={2} sx={{ height: "100%", overflowY: "auto", p: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "stretch" }}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={modo}
          onChange={(_evento, valor: ModoPipeline | null) => valor && setModo(valor)}
          sx={{ flex: 1 }}
        >
          <ToggleButton value="fijo">Modo fijo</ToggleButton>
          <ToggleButton value="libre">Modo libre</ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title={mostrarBorrador ? "Ocultar borrador" : "Ver borrador del modo libre"}>
          <IconButton
            aria-label={mostrarBorrador ? "Ocultar borrador" : "Ver borrador del modo libre"}
            color={mostrarBorrador ? "primary" : "default"}
            onClick={() => setMostrarBorrador((visible) => !visible)}
            sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}
          >
            {mostrarBorrador ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
        </Tooltip>
      </Stack>

      {mostrarBorrador && (
        <Box
          sx={{
            position: "fixed",
            top: 49,
            right: ANCHO_PANEL_CONTROLES,
            bottom: 0,
            width: 360,
            maxWidth: `calc(100vw - ${ANCHO_PANEL_CONTROLES}px)`,
            zIndex: (tema) => tema.zIndex.drawer,
            bgcolor: "background.paper",
            borderLeft: 1,
            borderRight: 1,
            borderColor: "divider",
            boxShadow: 8,
          }}
        >
          <Stack sx={{ height: "100%" }}>
          <Stack direction="row" sx={{ p: 2, alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6">Borradores</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {borradores.length} guardado{borradores.length === 1 ? "" : "s"} localmente
              </Typography>
            </Box>
            <IconButton aria-label="Cerrar borradores" onClick={() => setMostrarBorrador(false)}>
              <VisibilityOffIcon />
            </IconButton>
          </Stack>
          <Divider />

          <Stack spacing={1} sx={{ p: 2 }}>
            <TextField
              size="small"
              label="Nombre del borrador"
              value={nombreBorrador}
              onChange={(evento) => setNombreBorrador(evento.target.value)}
              onKeyDown={(evento) => evento.key === "Enter" && guardarBorrador()}
            />
            <Button variant="contained" onClick={guardarBorrador} disabled={etapasLibre.length === 0}>
              Guardar pipeline libre actual
            </Button>
          </Stack>
          <Divider />

          <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2 }}>
            {borradores.length === 0 && (
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
                Todavía no hay borradores guardados.
              </Typography>
            )}
            {borradores.map((borrador) => (
              <Card key={borrador.id} variant="outlined" sx={{ p: 1.5, flexShrink: 0 }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="subtitle2" sx={{ flex: 1 }} noWrap title={borrador.nombre}>
                      {borrador.nombre}
                    </Typography>
                    <Chip size="small" label={`${borrador.etapas.length} etapas`} />
                  </Stack>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {new Date(borrador.actualizadoEn).toLocaleString()}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => {
                      cargarEtapasLibres(borrador.etapas);
                      if (borrador.imagenId) onCambiarImagen(borrador.imagenId);
                      setMostrarBorrador(false);
                    }}>
                      Cargar
                    </Button>
                    <Button size="small" color="error" onClick={() => eliminarBorrador(borrador.id)}>
                      Eliminar
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>
          </Stack>
        </Box>
      )}

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
          slotProps={{
            select: {
              MenuProps: { slotProps: { paper: { sx: { maxHeight: 420 } } } },
            },
          }}
        >
          {categoriasEtapas.flatMap((categoria) => [
              <ListSubheader key={`categoria-${categoria.id}`} sx={{ fontWeight: 700, lineHeight: "34px" }}>
                {categoria.etiqueta}
              </ListSubheader>,
              ...categoria.etapas.map((definicion) => (
                <MenuItem key={definicion.tipo} value={definicion.tipo} sx={{ pl: 3 }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {definicion.etiqueta}
                  </Typography>
                  <AyudaEtapa tipo={definicion.tipo} titulo={definicion.etiqueta} />
                </MenuItem>
              )),
          ])}
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
                  const identidad = identidadesEtapasLibre[indice] ?? `${etapa.tipo}-${indice}`;
                  return (
                    <Draggable key={identidad} draggableId={identidad} index={indice}>
                      {(provistoArrastre) => (
                        <Box
                          ref={provistoArrastre.innerRef}
                          {...provistoArrastre.draggableProps}
                        >
                          <SeccionEtapa
                            definicion={definicion}
                            etapa={etapa}
                            onAlternarActiva={() => alternarActiva(indice)}
                            onCambiarParametro={(nombre, valor) => actualizarParametro(indice, nombre, valor)}
                            accionesExtra={(
                              <Stack direction="row" sx={{ alignItems: "center" }}>
                                <Tooltip title="Mover etapa">
                                  <IconButton
                                    size="small"
                                    aria-label="Mover etapa"
                                    {...provistoArrastre.dragHandleProps}
                                    sx={{ cursor: "grab", "&:active": { cursor: "grabbing" } }}
                                  >
                                    <DragIndicatorIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Eliminar etapa">
                                  <IconButton
                                    size="small"
                                    aria-label="Eliminar etapa"
                                    onClick={() => quitarEtapa(indice)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            )}
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
