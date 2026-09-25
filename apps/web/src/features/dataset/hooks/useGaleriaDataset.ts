import { useCallback, useEffect, useReducer, useRef } from "react";
import type { UIEvent } from "react";

import { useListarImagenesDatasetQuery } from "../datasetApi";
import { CLASE_PATENTE } from "../dataset.types";
import type { CajaDeteccion, ImagenDatasetResumida, VeredictoDeteccion } from "../dataset.types";
import { etiquetaOpuesta, siguienteVeredicto, useAccionesEtiquetaImagen } from "./useAccionesEtiquetaImagen";
import type { FiltrosDataset } from "./useFiltrosDataset";

const TAMANO_PAGINA = 24;
const UMBRAL_AUTOCARGA_PX = 400;

interface EstadoGaleria {
  cursor: string | undefined;
  imagenes: ImagenDatasetResumida[];
  indiceVisible: number;
  indiceEnfocado: number;
}

type AccionGaleria =
  | { tipo: "reset" }
  | { tipo: "cargar_siguiente"; cursor: string }
  | { tipo: "pagina_recibida"; imagenes: ImagenDatasetResumida[] }
  | { tipo: "set_indice_visible"; indice: number }
  | { tipo: "set_indice_enfocado"; indice: number }
  | { tipo: "clamp_indice_enfocado" }
  | { tipo: "toggle_etiqueta"; imagenId: string; clave: string }
  | {
      tipo: "set_veredicto";
      imagenId: string;
      cajaId: string;
      veredicto: VeredictoDeteccion | null;
    };

const ESTADO_INICIAL: EstadoGaleria = {
  cursor: undefined,
  imagenes: [],
  indiceVisible: 0,
  indiceEnfocado: 0,
};

function reductorGaleria(estado: EstadoGaleria, accion: AccionGaleria): EstadoGaleria {
  switch (accion.tipo) {
    case "reset":
      return ESTADO_INICIAL;
    case "cargar_siguiente":
      return { ...estado, cursor: accion.cursor };
    case "pagina_recibida": {
      const mapa = new Map(estado.imagenes.map((imagen) => [imagen.id, imagen]));
      accion.imagenes.forEach((imagen) => mapa.set(imagen.id, imagen));
      return { ...estado, imagenes: Array.from(mapa.values()) };
    }
    case "set_indice_visible":
      return { ...estado, indiceVisible: accion.indice };
    case "set_indice_enfocado":
      return { ...estado, indiceEnfocado: accion.indice };
    case "clamp_indice_enfocado":
      if (estado.imagenes.length === 0 || estado.indiceEnfocado < estado.imagenes.length) {
        return estado;
      }
      return { ...estado, indiceEnfocado: estado.imagenes.length - 1 };
    case "toggle_etiqueta":
      return {
        ...estado,
        imagenes: estado.imagenes.map((img) => {
          if (img.id !== accion.imagenId) return img;
          const yaAsignada = img.etiquetas.some((etiqueta) => etiqueta.clave === accion.clave);
          return {
            ...img,
            etiquetas: yaAsignada
              ? img.etiquetas.filter((etiqueta) => etiqueta.clave !== accion.clave)
              : [...img.etiquetas, { clave: accion.clave, origen: "manual" as const, nota: null }],
          };
        }),
      };
    case "set_veredicto":
      return {
        ...estado,
        imagenes: estado.imagenes.map((img) =>
          img.id !== accion.imagenId
            ? img
            : {
                ...img,
                cajas: img.cajas.map((caja) =>
                  caja.id === accion.cajaId ? { ...caja, veredicto: accion.veredicto } : caja,
                ),
              },
        ),
      };
    default:
      return estado;
  }
}

/** Paginación acumulada + selección/foco + updates optimistas de una galería del dataset.
 * La galería se reinicia sola cada vez que cambia cualquier campo de `filtros` (menos el primer
 * render); `resetearGaleria` queda expuesto solo para cuando los DATOS del servidor cambiaron sin
 * que cambiara ningún filtro (aceptar-por-confianza en masa). */
export function useGaleriaDataset(filtros: FiltrosDataset, altoEncabezadoFijo: number) {
  const [estado, dispatch] = useReducer(reductorGaleria, ESTADO_INICIAL);
  const refContenedor = useRef<HTMLDivElement>(null);
  const refGaleria = useRef<HTMLDivElement>(null);

  // El filtro de confianza exige "existe una patente pendiente en ese rango" — contradictorio con
  // las vistas que por definición excluyen la patente ("sin_deteccion", "vehiculo_sin_patente").
  // Combinados siempre dan 0 resultados aunque la pestaña muestre un contador > 0 (ese contador
  // sale de `obtenerResumen`, que no aplica este filtro) — se ignora acá en vez de confundir.
  const vistaCompatibleConConfianza = filtros.vista !== "sin_deteccion" && filtros.vista !== "vehiculo_sin_patente";

  const { data: pagina, isFetching: cargandoImagenes } = useListarImagenesDatasetQuery({
    vista: filtros.vista,
    planta: filtros.planta || undefined,
    fechaDesde: filtros.fechaDesde || undefined,
    fechaHasta: filtros.fechaHasta || undefined,
    etiqueta: filtros.etiquetaFiltro || undefined,
    confianzaMin: vistaCompatibleConConfianza ? filtros.confianzaMin : undefined,
    confianzaMax: vistaCompatibleConConfianza ? filtros.confianzaMax : undefined,
    confianzaClase:
      vistaCompatibleConConfianza && filtros.confianzaMin !== undefined ? CLASE_PATENTE : undefined,
    cursor: estado.cursor,
    limite: TAMANO_PAGINA,
  });

  const acciones = useAccionesEtiquetaImagen();

  const resetearGaleria = useCallback(() => {
    dispatch({ tipo: "reset" });
    refContenedor.current?.scrollTo({ top: 0 });
  }, []);

  // Cualquier cambio en los filtros deja obsoleta la paginación acumulada localmente. Comparar
  // contra la clave anterior real (no un ref "¿ya monté?") es inmune al doble-invoke de efectos
  // de React StrictMode en dev — con el patrón "saltar el primer render" la segunda invocación
  // del mismo mount ve el ref ya en `true` y resetea la galería en cada carga de página.
  const claveFiltros = JSON.stringify(filtros);
  const filtrosAnteriores = useRef(claveFiltros);
  useEffect(() => {
    if (filtrosAnteriores.current === claveFiltros) return;
    filtrosAnteriores.current = claveFiltros;
    resetearGaleria();
  }, [claveFiltros, resetearGaleria]);

  useEffect(() => {
    if (!pagina) return;
    dispatch({ tipo: "pagina_recibida", imagenes: pagina.imagenes });
  }, [pagina]);

  useEffect(() => {
    dispatch({ tipo: "clamp_indice_enfocado" });
  }, [estado.imagenes.length]);

  useEffect(() => {
    const celda = refGaleria.current?.querySelector(`[data-indice="${estado.indiceEnfocado}"]`);
    celda?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [estado.indiceEnfocado]);

  const hayMas = pagina?.siguienteCursor != null;

  const alHacerScroll = useCallback(
    (evento: UIEvent<HTMLDivElement>) => {
      const el = evento.currentTarget;
      const cercaDelFinal = el.scrollHeight - el.scrollTop - el.clientHeight < UMBRAL_AUTOCARGA_PX;
      if (cercaDelFinal && hayMas && !cargandoImagenes && pagina?.siguienteCursor) {
        dispatch({ tipo: "cargar_siguiente", cursor: pagina.siguienteCursor });
      }
    },
    [hayMas, cargandoImagenes, pagina],
  );

  useEffect(() => {
    const galeria = refGaleria.current;
    const contenedor = refContenedor.current;
    if (!galeria || !contenedor || estado.imagenes.length === 0) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        const indicesVisibles = entradas
          .filter((entrada) => entrada.isIntersecting)
          .map((entrada) => Number((entrada.target as HTMLElement).dataset.indice))
          .filter((indice) => !Number.isNaN(indice));
        if (indicesVisibles.length > 0) {
          dispatch({ tipo: "set_indice_visible", indice: Math.min(...indicesVisibles) + 1 });
        }
      },
      {
        root: contenedor,
        rootMargin: `-${altoEncabezadoFijo}px 0px -75% 0px`,
        threshold: 0,
      },
    );

    const celdas = galeria.querySelectorAll("[data-indice]");
    celdas.forEach((celda) => observador.observe(celda));
    return () => observador.disconnect();
  }, [estado.imagenes, altoEncabezadoFijo]);

  const setIndiceEnfocado = useCallback((indice: number) => {
    dispatch({ tipo: "set_indice_enfocado", indice });
  }, []);

  const onToggleEtiqueta = useCallback(
    (imagen: ImagenDatasetResumida, clave: string) => {
      const yaAsignada = imagen.etiquetas.some((etiqueta) => etiqueta.clave === clave);
      dispatch({ tipo: "toggle_etiqueta", imagenId: imagen.id, clave });
      if (!yaAsignada) {
        const opuesta = etiquetaOpuesta(clave);
        const opuestaAsignada =
          opuesta != null && imagen.etiquetas.some((etiqueta) => etiqueta.clave === opuesta);
        if (opuesta != null && opuestaAsignada) {
          dispatch({ tipo: "toggle_etiqueta", imagenId: imagen.id, clave: opuesta });
        }
      }
      acciones.onToggleEtiqueta(imagen, clave);
    },
    [acciones],
  );

  const onCicloVeredicto = useCallback(
    (imagen: ImagenDatasetResumida, caja: CajaDeteccion) => {
      dispatch({
        tipo: "set_veredicto",
        imagenId: imagen.id,
        cajaId: caja.id,
        veredicto: siguienteVeredicto(caja.veredicto),
      });
      acciones.onCicloVeredicto(imagen, caja);
    },
    [acciones],
  );

  return {
    imagenes: estado.imagenes,
    total: pagina?.total ?? 0,
    indiceVisible: estado.indiceVisible,
    indiceEnfocado: estado.indiceEnfocado,
    setIndiceEnfocado,
    cargandoImagenes,
    refContenedor,
    refGaleria,
    alHacerScroll,
    resetearGaleria,
    onToggleEtiqueta,
    onCicloVeredicto,
  };
}
