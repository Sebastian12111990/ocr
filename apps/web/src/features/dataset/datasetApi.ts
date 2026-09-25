import { apiSlice } from "@/app/store/apiSlice";
import type {
  DatosIniciarProcesamiento,
  EstadisticasTamanoPatente,
  EstadoProcesamiento,
  FechaDataset,
  FiltrosAceptarPorConfianza,
  FiltrosAceptarTodas,
  FiltrosDescartarPorForma,
  FiltrosDescartarPorTamanoRelativo,
  FiltrosEstadisticasTamanoPatente,
  FiltrosResumenDataset,
  ImagenDatasetResumida,
  ModeloDeteccion,
  PaginaImagenesDataset,
  PrevisualizacionAceptarPorConfianza,
  PrevisualizacionAceptarTodas,
  PrevisualizacionDescartarPorForma,
  PrevisualizacionDescartarPorTamanoRelativo,
  ResultadoAceptarPorConfianza,
  ResultadoAceptarTodas,
  ResultadoDescartarPorForma,
  ResultadoDescartarPorTamanoRelativo,
  ResumenDataset,
  TipoEtiquetaResumen,
  VeredictoDeteccion,
  VistaDataset,
} from "./dataset.types";

export function urlImagenDataset(id: string): string {
  return `/api/dataset/imagenes/${id}/archivo`;
}

interface FiltrosListarImagenes {
  vista: VistaDataset;
  planta?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  etiqueta?: string;
  sinEtiqueta?: string;
  confianzaMin?: number;
  confianzaMax?: number;
  confianzaClase?: string;
  cursor?: string;
  limite?: number;
}

export const datasetApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    obtenerResumenDataset: builder.query<ResumenDataset, FiltrosResumenDataset | void>({
      query: (filtros) => ({ url: "dataset/resumen", params: filtros ?? {} }),
      providesTags: ["ResumenDataset"],
    }),
    listarTiposEtiqueta: builder.query<TipoEtiquetaResumen[], void>({
      query: () => "dataset/tipos-etiqueta",
      providesTags: ["TiposEtiqueta"],
    }),
    listarFechasDataset: builder.query<FechaDataset[], { planta: string }>({
      query: ({ planta }) => ({ url: "dataset/fechas", params: { planta } }),
      providesTags: ["ResumenDataset"],
    }),
    listarModelosDataset: builder.query<ModeloDeteccion[], void>({
      query: () => "dataset/modelos",
    }),
    listarImagenesDataset: builder.query<PaginaImagenesDataset, FiltrosListarImagenes>({
      query: (filtros) => ({ url: "dataset/imagenes", params: filtros }),
      providesTags: (resultado) =>
        resultado
          ? [
              ...resultado.imagenes.map((imagen) => ({ type: "ImagenDataset" as const, id: imagen.id })),
              { type: "ImagenDataset" as const, id: "LISTA" },
            ]
          : [{ type: "ImagenDataset" as const, id: "LISTA" }],
    }),
    asignarEtiqueta: builder.mutation<void, { imagenId: string; clave: string; nota?: string | null }>({
      query: ({ imagenId, clave, nota }) => ({
        url: `dataset/imagenes/${imagenId}/etiquetas/${encodeURIComponent(clave)}`,
        method: "PUT",
        body: { nota: nota ?? null },
      }),
      invalidatesTags: (_resultado, _error, { imagenId }) => [
        { type: "ImagenDataset", id: imagenId },
        "ResumenDataset",
      ],
    }),
    quitarEtiqueta: builder.mutation<void, { imagenId: string; clave: string }>({
      query: ({ imagenId, clave }) => ({
        url: `dataset/imagenes/${imagenId}/etiquetas/${encodeURIComponent(clave)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_resultado, _error, { imagenId }) => [
        { type: "ImagenDataset", id: imagenId },
        "ResumenDataset",
      ],
    }),
    fijarVeredicto: builder.mutation<void, { deteccionId: string; imagenId: string; veredicto: VeredictoDeteccion | null }>(
      {
        query: ({ deteccionId, veredicto }) => ({
          url: `dataset/detecciones/${deteccionId}`,
          method: "PATCH",
          body: { veredicto },
        }),
        invalidatesTags: (_resultado, _error, { imagenId }) => [
          { type: "ImagenDataset", id: imagenId },
          "ResumenDataset",
        ],
      },
    ),
    previsualizarAceptarPorConfianza: builder.query<PrevisualizacionAceptarPorConfianza, FiltrosAceptarPorConfianza>({
      query: (filtros) => ({ url: "dataset/detecciones/aceptar-por-confianza/previsualizar", params: filtros }),
    }),
    aceptarPorConfianza: builder.mutation<ResultadoAceptarPorConfianza, FiltrosAceptarPorConfianza>({
      query: (filtros) => ({ url: "dataset/detecciones/aceptar-por-confianza", method: "POST", body: filtros }),
      invalidatesTags: ["ResumenDataset", { type: "ImagenDataset", id: "LISTA" }],
    }),
    previsualizarAceptarTodas: builder.query<PrevisualizacionAceptarTodas, FiltrosAceptarTodas>({
      query: (filtros) => ({ url: "dataset/detecciones/aceptar-todas/previsualizar", params: filtros }),
    }),
    aceptarTodas: builder.mutation<ResultadoAceptarTodas, FiltrosAceptarTodas>({
      query: (filtros) => ({ url: "dataset/detecciones/aceptar-todas", method: "POST", body: filtros }),
      invalidatesTags: ["ResumenDataset", { type: "ImagenDataset", id: "LISTA" }],
    }),
    previsualizarDescartarPorForma: builder.query<PrevisualizacionDescartarPorForma, FiltrosDescartarPorForma>({
      query: (filtros) => ({ url: "dataset/detecciones/descartar-por-forma/previsualizar", params: filtros }),
    }),
    listarImagenesDescartarPorForma: builder.query<ImagenDatasetResumida[], FiltrosDescartarPorForma>({
      query: (filtros) => ({ url: "dataset/detecciones/descartar-por-forma/imagenes", params: filtros }),
      providesTags: (resultado) =>
        resultado
          ? [
              ...resultado.map((imagen) => ({ type: "ImagenDataset" as const, id: imagen.id })),
              { type: "ImagenDataset" as const, id: "LISTA" },
            ]
          : [{ type: "ImagenDataset" as const, id: "LISTA" }],
    }),
    descartarPorForma: builder.mutation<ResultadoDescartarPorForma, FiltrosDescartarPorForma>({
      query: (filtros) => ({ url: "dataset/detecciones/descartar-por-forma", method: "POST", body: filtros }),
      invalidatesTags: ["ResumenDataset", { type: "ImagenDataset", id: "LISTA" }],
    }),
    previsualizarDescartarPorTamanoRelativo: builder.query<
      PrevisualizacionDescartarPorTamanoRelativo,
      FiltrosDescartarPorTamanoRelativo
    >({
      query: (filtros) => ({ url: "dataset/detecciones/descartar-por-tamano-relativo/previsualizar", params: filtros }),
    }),
    listarImagenesDescartarPorTamanoRelativo: builder.query<ImagenDatasetResumida[], FiltrosDescartarPorTamanoRelativo>({
      query: (filtros) => ({ url: "dataset/detecciones/descartar-por-tamano-relativo/imagenes", params: filtros }),
      providesTags: (resultado) =>
        resultado
          ? [
              ...resultado.map((imagen) => ({ type: "ImagenDataset" as const, id: imagen.id })),
              { type: "ImagenDataset" as const, id: "LISTA" },
            ]
          : [{ type: "ImagenDataset" as const, id: "LISTA" }],
    }),
    descartarPorTamanoRelativo: builder.mutation<ResultadoDescartarPorTamanoRelativo, FiltrosDescartarPorTamanoRelativo>({
      query: (filtros) => ({ url: "dataset/detecciones/descartar-por-tamano-relativo", method: "POST", body: filtros }),
      invalidatesTags: ["ResumenDataset", { type: "ImagenDataset", id: "LISTA" }],
    }),
    obtenerEstadisticasTamano: builder.query<EstadisticasTamanoPatente, FiltrosEstadisticasTamanoPatente>({
      query: (filtros) => ({ url: "dataset/detecciones/estadisticas-tamano", params: filtros }),
      providesTags: ["ResumenDataset"],
    }),
    previsualizarNoIncluidasPorTamanoRelativo: builder.query<
      PrevisualizacionDescartarPorTamanoRelativo,
      FiltrosDescartarPorTamanoRelativo
    >({
      query: (filtros) => ({
        url: "dataset/detecciones/descartar-por-tamano-relativo/no-incluidas/previsualizar",
        params: filtros,
      }),
      providesTags: ["ResumenDataset"],
    }),
    listarImagenesNoIncluidasPorTamanoRelativo: builder.query<ImagenDatasetResumida[], FiltrosDescartarPorTamanoRelativo>({
      query: (filtros) => ({ url: "dataset/detecciones/descartar-por-tamano-relativo/no-incluidas", params: filtros }),
      providesTags: (resultado) =>
        resultado
          ? [
              ...resultado.map((imagen) => ({ type: "ImagenDataset" as const, id: imagen.id })),
              { type: "ImagenDataset" as const, id: "LISTA" },
            ]
          : [{ type: "ImagenDataset" as const, id: "LISTA" }],
    }),
    iniciarProcesamiento: builder.mutation<EstadoProcesamiento, DatosIniciarProcesamiento>({
      query: (datos) => ({ url: "dataset/procesos", method: "POST", body: datos }),
    }),
    obtenerEstadoProcesamiento: builder.query<EstadoProcesamiento, void>({
      query: () => "dataset/procesos/actual",
      // Estado en tiempo real por WebSocket en vez de polling: el fetch inicial pinta rápido,
      // después el servidor empuja cada cambio (ver procesos.websocket.ts en apps/api).
      async onCacheEntryAdded(_arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        let socket: WebSocket | undefined;
        try {
          await cacheDataLoaded;
          const protocolo = window.location.protocol === "https:" ? "wss" : "ws";
          socket = new WebSocket(`${protocolo}://${window.location.host}/api/dataset/procesos/stream`);
          socket.addEventListener("message", (evento) => {
            const estado = JSON.parse(evento.data as string) as EstadoProcesamiento;
            updateCachedData(() => estado);
          });
        } catch {
          // cacheDataLoaded nunca resolvió (la query inicial falló) — nada que limpiar.
        }
        await cacheEntryRemoved;
        socket?.close();
      },
    }),
  }),
});

export const {
  useObtenerResumenDatasetQuery,
  useListarTiposEtiquetaQuery,
  useListarFechasDatasetQuery,
  useListarModelosDatasetQuery,
  useListarImagenesDatasetQuery,
  useAsignarEtiquetaMutation,
  useQuitarEtiquetaMutation,
  useFijarVeredictoMutation,
  useIniciarProcesamientoMutation,
  useObtenerEstadoProcesamientoQuery,
  useLazyPrevisualizarAceptarPorConfianzaQuery,
  useAceptarPorConfianzaMutation,
  useLazyPrevisualizarAceptarTodasQuery,
  useAceptarTodasMutation,
  useLazyPrevisualizarDescartarPorFormaQuery,
  useDescartarPorFormaMutation,
  useListarImagenesDescartarPorFormaQuery,
  useLazyPrevisualizarDescartarPorTamanoRelativoQuery,
  useDescartarPorTamanoRelativoMutation,
  useListarImagenesDescartarPorTamanoRelativoQuery,
  useObtenerEstadisticasTamanoQuery,
  usePrevisualizarNoIncluidasPorTamanoRelativoQuery,
  useListarImagenesNoIncluidasPorTamanoRelativoQuery,
} = datasetApi;
