import { apiSlice } from "@/app/store/apiSlice";
import type { Pipeline } from "@/features/editor/pipeline.types";
import type { Ejecucion, Preset } from "./resultados.types";

export interface SolicitudOcr {
  imagenId: string;
  pipeline: Pipeline;
  presetId?: string | null;
}

export const resultadosApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    ejecutarOcr: builder.mutation<Ejecucion, SolicitudOcr>({
      query: (cuerpo) => ({ url: "ocr", method: "POST", body: cuerpo }),
      invalidatesTags: ["Ejecuciones"],
    }),
    listarEjecuciones: builder.query<Ejecucion[], { imagenId?: string } | void>({
      query: (filtros) => ({ url: "ejecuciones", params: filtros ?? {} }),
      providesTags: ["Ejecuciones"],
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
  useListarEjecucionesQuery,
  useListarPresetsQuery,
  useCrearPresetMutation,
} = resultadosApi;
