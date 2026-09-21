import { apiSlice } from "@/app/store/apiSlice";
import type { DetalleEntrenamiento, MetricaEpocaRespuesta, ResumenEntrenamiento } from "./entrenamientos.types";

export const entrenamientosApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listarEntrenamientos: builder.query<ResumenEntrenamiento[], void>({
      query: () => "entrenamientos",
      providesTags: ["Entrenamientos"],
    }),
    obtenerDetalleEntrenamiento: builder.query<DetalleEntrenamiento, string>({
      query: (id) => `entrenamientos/${id}`,
      providesTags: (_resultado, _error, id) => [{ type: "Entrenamientos", id }],
    }),
    obtenerMetricasEntrenamiento: builder.query<MetricaEpocaRespuesta[], string>({
      query: (id) => `entrenamientos/${id}/metricas`,
    }),
  }),
});

export const {
  useListarEntrenamientosQuery,
  useObtenerDetalleEntrenamientoQuery,
  useObtenerMetricasEntrenamientoQuery,
} = entrenamientosApi;
