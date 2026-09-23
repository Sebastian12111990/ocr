import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppBar,
  Box,
  CircularProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";

import { GaleriaImagenes } from "../components/GaleriaImagenes";
import { PanelProcesamiento } from "../components/PanelProcesamiento";
import { ResumenDatasetCards } from "../components/ResumenDatasetCards";
import { SelectorRangoFechas } from "../components/SelectorRangoFechas";
import {
  useAsignarEtiquetaMutation,
  useFijarVeredictoMutation,
  useListarImagenesDatasetQuery,
  useListarTiposEtiquetaQuery,
  useObtenerResumenDatasetQuery,
  useQuitarEtiquetaMutation,
} from "../datasetApi";
import { ALTO_CAMPO_FILTRO, ANCHO_CAMPO_FILTRO, ETIQUETAS_VISTA } from "../dataset.types";
import type { CajaDeteccion, ImagenDatasetResumida, VeredictoDeteccion, VistaDataset } from "../dataset.types";

const VISTAS: VistaDataset[] = ["todas", "con_patente", "vehiculo_sin_patente", "sin_vehiculo_con_patente", "sin_deteccion"];
const TAMANO_PAGINA = 24;
const UMBRAL_AUTOCARGA_PX = 400;

const CLAVE_FILTROS_GUARDADOS = "dataset:filtros";

interface FiltrosGuardados {
  vista: VistaDataset;
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  etiquetaFiltro: string;
}

/** Persistencia simple en localStorage — sobrevive a F5. Si falla (modo privado, cuota), se ignora. */
function leerFiltrosGuardados(): Partial<FiltrosGuardados> {
  try {
    const crudo = localStorage.getItem(CLAVE_FILTROS_GUARDADOS);
    return crudo ? (JSON.parse(crudo) as Partial<FiltrosGuardados>) : {};
  } catch {
    return {};
  }
}

function siguienteVeredicto(actual: VeredictoDeteccion | null): VeredictoDeteccion | null {
  if (actual === null) return "correcta";
  if (actual === "correcta") return "falso_positivo";
  return null;
}

export function DatasetPage() {
  const [filtrosIniciales] = useState(leerFiltrosGuardados);
  const [vista, setVista] = useState<VistaDataset>(filtrosIniciales.vista ?? "todas");
  const [planta, setPlanta] = useState(filtrosIniciales.planta ?? "");
  const [fechaDesde, setFechaDesde] = useState(filtrosIniciales.fechaDesde ?? "");
  const [fechaHasta, setFechaHasta] = useState(filtrosIniciales.fechaHasta ?? "");
  const [etiquetaFiltro, setEtiquetaFiltro] = useState(filtrosIniciales.etiquetaFiltro ?? "");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [imagenes, setImagenes] = useState<ImagenDatasetResumida[]>([]);
  const [indiceVisible, setIndiceVisible] = useState(0);

  const refContenedor = useRef<HTMLDivElement>(null);
  const refEncabezado = useRef<HTMLDivElement>(null);
  const refGaleria = useRef<HTMLDivElement>(null);

  const { data: resumen, isLoading: cargandoResumen } = useObtenerResumenDatasetQuery({
    planta: planta || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  });
  const { data: tiposEtiqueta } = useListarTiposEtiquetaQuery();

  const { data: pagina, isFetching: cargandoImagenes } = useListarImagenesDatasetQuery({
    vista,
    planta: planta || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
    etiqueta: etiquetaFiltro || undefined,
    cursor,
    limite: TAMANO_PAGINA,
  });

  const [asignarEtiqueta] = useAsignarEtiquetaMutation();
  const [quitarEtiqueta] = useQuitarEtiquetaMutation();
  const [fijarVeredicto] = useFijarVeredictoMutation();

  useEffect(() => {
    if (!pagina) return;
    setImagenes((previas) => {
      const mapa = new Map(previas.map((imagen) => [imagen.id, imagen]));
      pagina.imagenes.forEach((imagen) => mapa.set(imagen.id, imagen));
      return Array.from(mapa.values());
    });
  }, [pagina]);

  useEffect(() => {
    try {
      const filtros: FiltrosGuardados = { vista, planta, fechaDesde, fechaHasta, etiquetaFiltro };
      localStorage.setItem(CLAVE_FILTROS_GUARDADOS, JSON.stringify(filtros));
    } catch {
      // No crítico — si falla, simplemente no persiste entre recargas.
    }
  }, [vista, planta, fechaDesde, fechaHasta, etiquetaFiltro]);

  const resetearYAplicar = (aplicar: () => void) => {
    aplicar();
    setCursor(undefined);
    setImagenes([]);
    setIndiceVisible(0);
    refContenedor.current?.scrollTo({ top: 0 });
  };

  const total = pagina?.total ?? 0;
  const hayMas = pagina?.siguienteCursor != null;

  const alHacerScroll = (evento: React.UIEvent<HTMLDivElement>) => {
    const el = evento.currentTarget;
    const cercaDelFinal = el.scrollHeight - el.scrollTop - el.clientHeight < UMBRAL_AUTOCARGA_PX;
    if (cercaDelFinal && hayMas && !cargandoImagenes && pagina?.siguienteCursor) {
      setCursor(pagina.siguienteCursor);
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

  const onToggleEtiqueta = (imagen: ImagenDatasetResumida, clave: string) => {
    const yaAsignada = imagen.etiquetas.some((etiqueta) => etiqueta.clave === clave);
    if (yaAsignada) {
      void quitarEtiqueta({ imagenId: imagen.id, clave });
    } else {
      void asignarEtiqueta({ imagenId: imagen.id, clave });
    }
  };

  const onCicloVeredicto = (imagen: ImagenDatasetResumida, caja: CajaDeteccion) => {
    void fijarVeredicto({ deteccionId: caja.id, imagenId: imagen.id, veredicto: siguienteVeredicto(caja.veredicto) });
  };

  const plantas = useMemo(
    () => (resumen?.porPlanta ?? []).filter((fila): fila is { planta: string; total: number } => fila.planta !== null),
    [resumen],
  );

  return (
    <Stack sx={{ height: "100%" }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar variant="dense">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Dataset
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

          <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              select
              size="small"
              label="Planta"
              value={planta}
              onChange={(evento) =>
                resetearYAplicar(() => {
                  setPlanta(evento.target.value);
                  setFechaDesde("");
                  setFechaHasta("");
                })
              }
              sx={{ width: ANCHO_CAMPO_FILTRO, "& .MuiInputBase-root": { height: ALTO_CAMPO_FILTRO } }}
            >
              <MenuItem value="">Todas</MenuItem>
              {plantas.map((fila) => (
                <MenuItem key={fila.planta} value={fila.planta}>
                  {fila.planta} ({fila.total.toLocaleString("es-CL")})
                </MenuItem>
              ))}
            </TextField>
            <SelectorRangoFechas
              planta={planta}
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              onCambiar={(desde, hasta) =>
                resetearYAplicar(() => {
                  setFechaDesde(desde);
                  setFechaHasta(hasta);
                })
              }
            />
            <TextField
              select
              size="small"
              label="Etiqueta"
              value={etiquetaFiltro}
              onChange={(evento) => resetearYAplicar(() => setEtiquetaFiltro(evento.target.value))}
              sx={{ width: ANCHO_CAMPO_FILTRO, "& .MuiInputBase-root": { height: ALTO_CAMPO_FILTRO } }}
            >
              <MenuItem value="">Cualquiera</MenuItem>
              {(tiposEtiqueta ?? []).map((tipo) => (
                <MenuItem key={tipo.clave} value={tipo.clave}>
                  {tipo.nombre}
                </MenuItem>
              ))}
            </TextField>
            <PanelProcesamiento planta={planta} fechaDesde={fechaDesde} fechaHasta={fechaHasta} />
          </Stack>

          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1.5 }}>
            Viendo imagen {indiceVisible || Math.min(1, imagenes.length)} de {total}
          </Typography>
          <Tabs
            value={vista}
            onChange={(_evento, valor: VistaDataset) => resetearYAplicar(() => setVista(valor))}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mt: 0.5 }}
          >
            {VISTAS.map((valor) => (
              <Tab key={valor} value={valor} label={`${ETIQUETAS_VISTA[valor]} (${resumen?.porVista[valor] ?? 0})`} />
            ))}
          </Tabs>
        </Box>

        <Box ref={refGaleria} sx={{ p: 2.5 }}>
          <GaleriaImagenes
            imagenes={imagenes}
            tiposEtiqueta={tiposEtiqueta ?? []}
            onCicloVeredicto={onCicloVeredicto}
            onToggleEtiqueta={onToggleEtiqueta}
          />
          <Stack sx={{ mt: 2.5, alignItems: "center" }}>{cargandoImagenes && <CircularProgress size={20} />}</Stack>
        </Box>
      </Box>
    </Stack>
  );
}
