import { useEffect, useMemo, useRef, useState } from "react";
import { AppBar, Box, CircularProgress, Stack, Tab, Tabs, Toolbar, Typography } from "@mui/material";

import { AccionCasoDificil } from "../components/AccionCasoDificil";
import { AccionCasoDificilAsignado } from "../components/AccionCasoDificilAsignado";
import { AccionQuitarClasificacion } from "../components/AccionQuitarClasificacion";
import { AccionRecuperarDescarte } from "../components/AccionRecuperarDescarte";
import { AccionesRevisionPatente } from "../components/AccionesRevisionPatente";
import { GaleriaImagenes } from "../components/GaleriaImagenes";
import { ResumenDatasetCards } from "../components/ResumenDatasetCards";
import {
  useListarClasificacionesQuery,
  useListarClasificadasQuery,
  useListarMuestraDatasetQuery,
  useListarTodasQuery,
  useObtenerResumenDatasetQuery,
} from "../datasetApi";
import type { ClasificacionImagen, ImagenDataset, OrigenImagenDataset, PerspectivaClasificacion } from "../dataset.types";

type Vista =
  | "todo"
  | "dataset"
  | "vehiculos_sin_patente"
  | "sin_vehiculo_con_patente"
  | "patente_sin_vehiculo"
  | "descartadas"
  | "sin_deteccion"
  | "casos_dificiles";
type ImagenListado = ImagenDataset & { clasificacionId?: string };

/** Vistas que se leen desde la tabla de clasificaciones, no directamente de una carpeta. */
const VISTAS_CLASIFICADAS: Partial<Record<Vista, PerspectivaClasificacion>> = {
  patente_sin_vehiculo: "patente_sin_vehiculo",
  descartadas: "descartada_sin_vehiculo",
  casos_dificiles: "caso_dificil",
};

const DESCRIPCIONES: Record<Vista, string> = {
  todo: "Todas las imágenes originales escaneadas, sin filtrar por ningún resultado de detección.",
  dataset:
    "El sondeo inicial (COCO) detectó un vehículo en la imagen y el detector de patentes confirmó una placa. Las que no tienen patente están en \"Falsos positivos\".",
  vehiculos_sin_patente:
    "Vehículo detectado, pero el detector de patentes no encontró ninguna placa en la imagen. Marcá el motivo (brillo, suciedad, etc.) — al marcarla pasa a \"Casos difíciles\" y sale de esta cola.",
  sin_vehiculo_con_patente:
    "El sondeo no reconoció un vehículo, pero el detector de patentes sí encontró una placa. Revisá cada caso: Aceptar la manda a \"Patente detectadas\", Descartar la manda a \"Descartadas\".",
  patente_sin_vehiculo:
    "Casos ya confirmados manualmente desde la pestaña anterior. Podés Descartar (pasa a \"Descartadas\") o Quitar (vuelve a pendientes).",
  descartadas:
    "Nada se borra del disco: esto solo excluye la imagen de la cola de revisión. Podés recuperarla si te equivocaste.",
  sin_deteccion:
    "Vehículo detectado pero sin patente encontrada. Marcá el motivo (brillo, suciedad, etc.) — al marcarla pasa a \"Casos difíciles\" y sale de esta cola.",
  casos_dificiles:
    "Todo lo marcado como caso difícil, venga de \"Falsos positivos\" o de \"Sin detección de patente\". Nada se borra del disco: podés quitar la etiqueta para que vuelva a su cola de origen.",
};

const TAMANO_PAGINA = 24;
const UMBRAL_AUTOCARGA_PX = 400;

function origenDeVista(vista: Vista): OrigenImagenDataset {
  if (vista === "sin_vehiculo_con_patente") return "sin_vehiculo";
  if (vista === "sin_deteccion") return "sin_deteccion";
  return "dataset";
}

/** Estas colas se vacían a medida que se clasifican: el ítem clasificado deja de aparecer. */
function debeExcluirClasificadas(vista: Vista): boolean {
  return vista === "sin_vehiculo_con_patente" || vista === "vehiculos_sin_patente" || vista === "sin_deteccion";
}

function claveImagen(imagen: ImagenDataset): string {
  return `${imagen.origen}:${imagen.nombre}`;
}

export function DatasetPage() {
  const [vista, setVista] = useState<Vista>("dataset");
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [imagenes, setImagenes] = useState<ImagenListado[]>([]);
  const [indiceVisible, setIndiceVisible] = useState(0);

  const refContenedor = useRef<HTMLDivElement>(null);
  const refEncabezado = useRef<HTMLDivElement>(null);
  const refGaleria = useRef<HTMLDivElement>(null);

  const { data: resumen, isLoading: cargandoResumen } = useObtenerResumenDatasetQuery();

  const perspectivaClasificada = VISTAS_CLASIFICADAS[vista];
  const usaTodas = vista === "todo";
  const usaClasificadas = perspectivaClasificada !== undefined;
  const usaMuestraCarpeta = !usaTodas && !usaClasificadas;

  const { data: paginaTodas, isFetching: cargandoTodas } = useListarTodasQuery(
    { limite: TAMANO_PAGINA, desplazamiento },
    { skip: !usaTodas },
  );

  const { data: paginaCarpeta, isFetching: cargandoCarpeta } = useListarMuestraDatasetQuery(
    {
      origen: origenDeVista(vista),
      limite: TAMANO_PAGINA,
      desplazamiento,
      soloConCaja: vista === "sin_vehiculo_con_patente" || vista === "dataset",
      soloSinCaja: vista === "vehiculos_sin_patente",
      excluirClasificadas: debeExcluirClasificadas(vista),
    },
    { skip: !usaMuestraCarpeta },
  );

  const { data: paginaClasificadas, isFetching: cargandoClasificadas } = useListarClasificadasQuery(
    { perspectiva: perspectivaClasificada ?? "patente_sin_vehiculo", limite: TAMANO_PAGINA, desplazamiento },
    { skip: !usaClasificadas },
  );

  const { data: casosDificiles } = useListarClasificacionesQuery({ perspectiva: "caso_dificil" });
  const mapaCasosDificiles = useMemo(() => {
    const mapa = new Map<string, ClasificacionImagen>();
    (casosDificiles ?? []).forEach((clasificacion) => mapa.set(clasificacion.nombreArchivo, clasificacion));
    return mapa;
  }, [casosDificiles]);

  const { data: patentesDetectadas } = useListarClasificacionesQuery({ perspectiva: "patente_sin_vehiculo" });
  const { data: descartadas } = useListarClasificacionesQuery({ perspectiva: "descartada_sin_vehiculo" });
  const { data: pendientesRevision } = useListarMuestraDatasetQuery({
    origen: "sin_vehiculo",
    limite: 1,
    desplazamiento: 0,
    soloConCaja: true,
    excluirClasificadas: true,
  });
  const { data: vehiculosConPatente } = useListarMuestraDatasetQuery({
    origen: "dataset",
    limite: 1,
    desplazamiento: 0,
    soloConCaja: true,
  });
  const { data: vehiculosSinPatente } = useListarMuestraDatasetQuery({
    origen: "dataset",
    limite: 1,
    desplazamiento: 0,
    soloSinCaja: true,
    excluirClasificadas: true,
  });
  const { data: sinDeteccionPendientes } = useListarMuestraDatasetQuery({
    origen: "sin_deteccion",
    limite: 1,
    desplazamiento: 0,
    excluirClasificadas: true,
  });

  const pestanas: { valor: Vista; etiqueta: string }[] = [
    { valor: "todo", etiqueta: `Todo (${resumen?.totalImagenes ?? 0})` },
    { valor: "dataset", etiqueta: `Vehículo detectado con patente (${vehiculosConPatente?.total ?? 0})` },
    { valor: "vehiculos_sin_patente", etiqueta: `Falsos positivos (${vehiculosSinPatente?.total ?? 0})` },
    { valor: "sin_vehiculo_con_patente", etiqueta: `Sin vehículo, con patente (${pendientesRevision?.total ?? 0})` },
    { valor: "patente_sin_vehiculo", etiqueta: `Patente detectadas (${patentesDetectadas?.length ?? 0})` },
    { valor: "descartadas", etiqueta: `Descartadas (${descartadas?.length ?? 0})` },
    { valor: "sin_deteccion", etiqueta: `Sin detección de patente (${sinDeteccionPendientes?.total ?? 0})` },
    { valor: "casos_dificiles", etiqueta: `Casos difíciles (${casosDificiles?.length ?? 0})` },
  ];

  const pagina = usaTodas ? paginaTodas : usaMuestraCarpeta ? paginaCarpeta : paginaClasificadas;
  const cargandoImagenes = usaTodas ? cargandoTodas : usaMuestraCarpeta ? cargandoCarpeta : cargandoClasificadas;

  useEffect(() => {
    if (!pagina) return;
    setImagenes((previas) => {
      const mapa = new Map(previas.map((imagen) => [claveImagen(imagen), imagen]));
      pagina.imagenes.forEach((imagen) => mapa.set(claveImagen(imagen), imagen));
      return Array.from(mapa.values());
    });
  }, [pagina]);

  const cambiarVista = (valor: Vista) => {
    setVista(valor);
    setDesplazamiento(0);
    setImagenes([]);
    setIndiceVisible(0);
    refContenedor.current?.scrollTo({ top: 0 });
  };

  const quitarDeListaLocal = (imagen: ImagenDataset) => {
    setImagenes((previas) => previas.filter((candidata) => claveImagen(candidata) !== claveImagen(imagen)));
  };

  const total = pagina?.total ?? 0;
  const hayMas = imagenes.length < total;

  const alHacerScroll = (evento: React.UIEvent<HTMLDivElement>) => {
    const el = evento.currentTarget;
    const cercaDelFinal = el.scrollHeight - el.scrollTop - el.clientHeight < UMBRAL_AUTOCARGA_PX;
    if (cercaDelFinal && hayMas && !cargandoImagenes) {
      setDesplazamiento(imagenes.length);
    }
  };

  useEffect(() => {
    const galeria = refGaleria.current;
    const contenedor = refContenedor.current;
    if (!galeria || !contenedor || imagenes.length === 0) return;

    const alturaEncabezado = refEncabezado.current?.offsetHeight ?? 0;
    const observador = new IntersectionObserver(
      (entradas) => {
        const indicesVisibles = entradas
          .filter((entrada) => entrada.isIntersecting)
          .map((entrada) => Number((entrada.target as HTMLElement).dataset.indice))
          .filter((indice) => !Number.isNaN(indice));
        if (indicesVisibles.length > 0) setIndiceVisible(Math.min(...indicesVisibles) + 1);
      },
      { root: contenedor, rootMargin: `-${alturaEncabezado}px 0px -75% 0px`, threshold: 0 },
    );

    const celdas = galeria.querySelectorAll("[data-indice]");
    celdas.forEach((celda) => observador.observe(celda));
    return () => observador.disconnect();
  }, [imagenes]);

  const renderAcciones = (imagen: ImagenListado) => {
    if (vista === "vehiculos_sin_patente") {
      return <AccionCasoDificil imagen={imagen} clasificacion={mapaCasosDificiles.get(imagen.nombre)} />;
    }
    if (vista === "sin_vehiculo_con_patente") {
      return <AccionesRevisionPatente imagen={imagen} onAccion={() => quitarDeListaLocal(imagen)} />;
    }
    if (vista === "patente_sin_vehiculo" && imagen.clasificacionId) {
      return (
        <AccionQuitarClasificacion
          imagen={imagen}
          clasificacionId={imagen.clasificacionId}
          onAccion={() => quitarDeListaLocal(imagen)}
        />
      );
    }
    if (vista === "descartadas" && imagen.clasificacionId) {
      return (
        <AccionRecuperarDescarte clasificacionId={imagen.clasificacionId} onQuitar={() => quitarDeListaLocal(imagen)} />
      );
    }
    if (vista === "sin_deteccion") {
      return <AccionCasoDificil imagen={imagen} clasificacion={mapaCasosDificiles.get(imagen.nombre)} />;
    }
    if (vista === "casos_dificiles") {
      const clasificacion = mapaCasosDificiles.get(imagen.nombre);
      if (!clasificacion) return null;
      return <AccionCasoDificilAsignado clasificacion={clasificacion} onQuitar={() => quitarDeListaLocal(imagen)} />;
    }
    return null;
  };

  return (
    <Stack sx={{ height: "100%" }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar variant="dense">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Dataset — D:\patentes Data Set
          </Typography>
        </Toolbar>
      </AppBar>

      <Box ref={refContenedor} onScroll={alHacerScroll} sx={{ overflow: "auto", flex: 1 }}>
        <Box
          ref={refEncabezado}
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
            px: 2.5,
            pt: 2.5,
            pb: 0,
          }}
        >
          {cargandoResumen && <CircularProgress size={24} />}
          {resumen && <ResumenDatasetCards resumen={resumen} />}
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1.5 }}>
            Viendo imagen {indiceVisible || Math.min(1, imagenes.length)} de {total}
          </Typography>
          <Tabs
            value={vista}
            onChange={(_evento, valor: Vista) => cambiarVista(valor)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mt: 0.5 }}
          >
            {pestanas.map((pestana) => (
              <Tab key={pestana.valor} value={pestana.valor} label={pestana.etiqueta} />
            ))}
          </Tabs>
        </Box>

        <Box ref={refGaleria} sx={{ p: 2.5 }}>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            {DESCRIPCIONES[vista]}
          </Typography>
          <GaleriaImagenes
            imagenes={imagenes}
            renderAcciones={vista === "dataset" || vista === "todo" ? undefined : renderAcciones}
          />
          <Stack sx={{ mt: 2.5, alignItems: "center" }}>
            {cargandoImagenes && <CircularProgress size={20} />}
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
}
