import { apiSlice } from "@/app/store/apiSlice";
import type { DetalleEntrenamiento, MetricaEpoca, ResumenEntrenamiento } from "./entrenamientos.types";

export const entrenamientosApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listarEntrenamientos: builder.query<ResumenEntrenamiento[], void>({
      query: () => "entrenamientos",
      providesTags: ["Entrenamientos"],
    }),
    obtenerEntrenamiento: builder.query<DetalleEntrenamiento, string>({
      query: (id) => `entrenamientos/${id}`,
    }),
    obtenerMetricasEntrenamiento: builder.query<MetricaEpoca[], string>({
      query: (id) => `entrenamientos/${id}/metricas`,
    }),
  }),
});

export const {
  useListarEntrenamientosQuery,
  useObtenerEntrenamientoQuery,
  useObtenerMetricasEntrenamientoQuery,
} = entrenamientosApi;
