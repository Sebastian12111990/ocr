import { apiSlice } from "@/app/store/apiSlice";
import type { Pipeline } from "@/features/editor/pipeline.types";
import type {
  DetalleEjecucion,
  Preset,
  ResultadoGuardarEjecucion,
  ResultadoOcrManual,
  ResumenEjecucion,
  SolicitudGuardarEjecucion,
} from "./resultados.types";

export interface SolicitudOcr {
  imagenId: string;
  pipeline: Pipeline;
}

export const resultadosApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    ejecutarOcr: builder.mutation<ResultadoOcrManual, SolicitudOcr>({
      query: (cuerpo) => ({ url: "ocr", method: "POST", body: cuerpo }),
    }),
    guardarEjecucion: builder.mutation<ResultadoGuardarEjecucion, SolicitudGuardarEjecucion>({
      query: (cuerpo) => ({ url: "ejecuciones", method: "POST", body: cuerpo }),
      invalidatesTags: ["Ejecuciones"],
    }),
    listarEjecuciones: builder.query<ResumenEjecucion[], { imagenId?: string } | void>({
      query: (filtros) => ({ url: "ejecuciones", params: filtros ?? {} }),
      providesTags: ["Ejecuciones"],
    }),
    obtenerEjecucion: builder.query<DetalleEjecucion, string>({
      query: (id) => `ejecuciones/${id}`,
    }),
    listarPresets: builder.query<Preset[], void>({
      query: () => "presets",
      providesTags: ["Presets"],
    }),
    crearPreset: builder.mutation<Preset, { nombre: string; pipeline: Pipeline }>({
      query: (cuerpo) => ({ url: "presets", method: "POST", body: cuerpo }),
      invalidatesTags: ["Presets"],
    }),
  }),
});

export const {
  useEjecutarOcrMutation,
  useGuardarEjecucionMutation,
  useListarEjecucionesQuery,
  useLazyObtenerEjecucionQuery,
  useListarPresetsQuery,
  useCrearPresetMutation,
} = resultadosApi;
