import { apiSlice } from "@/app/store/apiSlice";
import type {
  ClasificacionImagen,
  MotivoCasoDificil,
  MuestraClasificada,
  MuestraDataset,
  OrigenImagenDataset,
  PerspectivaClasificacion,
  ResumenDataset,
} from "./dataset.types";

export function urlImagenDataset(origen: OrigenImagenDataset, nombre: string): string {
  return `/api/dataset/imagen/${origen}/${encodeURIComponent(nombre)}`;
}

interface DatosClasificacion {
  nombreArchivo: string;
  origen: OrigenImagenDataset;
  perspectiva: PerspectivaClasificacion;
  motivo?: MotivoCasoDificil;
}

export const datasetApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    obtenerResumenDataset: builder.query<ResumenDataset, void>({
      query: () => "dataset/resumen",
      providesTags: ["Dataset"],
    }),
    listarTodas: builder.query<MuestraDataset, { limite?: number; desplazamiento?: number }>({
      query: ({ limite, desplazamiento }) => ({ url: "dataset/todas", params: { limite, desplazamiento } }),
      providesTags: ["Clasificaciones"],
    }),
    listarMuestraDataset: builder.query<
      MuestraDataset,
      {
        origen: OrigenImagenDataset;
        limite?: number;
        desplazamiento?: number;
        soloConCaja?: boolean;
        soloSinCaja?: boolean;
        excluirClasificadas?: boolean;
      }
    >({
      query: ({ origen, limite, desplazamiento, soloConCaja, soloSinCaja, excluirClasificadas }) => ({
        url: "dataset/muestra",
        params: { origen, limite, desplazamiento, soloConCaja, soloSinCaja, excluirClasificadas },
      }),
      providesTags: ["Clasificaciones"],
    }),
    listarClasificadas: builder.query<
      MuestraClasificada,
      { perspectiva: PerspectivaClasificacion; limite?: number; desplazamiento?: number }
    >({
      query: ({ perspectiva, limite, desplazamiento }) => ({
        url: "dataset/clasificadas",
        params: { perspectiva, limite, desplazamiento },
      }),
      providesTags: ["Clasificaciones"],
    }),
    listarClasificaciones: builder.query<ClasificacionImagen[], { perspectiva?: PerspectivaClasificacion } | void>({
      query: (args) => ({ url: "dataset/clasificaciones", params: args ?? {} }),
      providesTags: ["Clasificaciones"],
    }),
    crearClasificacion: builder.mutation<ClasificacionImagen, DatosClasificacion>({
      query: (datos) => ({ url: "dataset/clasificaciones", method: "POST", body: datos }),
      invalidatesTags: ["Clasificaciones"],
    }),
    eliminarClasificacion: builder.mutation<void, string>({
      query: (id) => ({ url: `dataset/clasificaciones/${id}`, method: "DELETE" }),
      invalidatesTags: ["Clasificaciones"],
    }),
  }),
});

export const {
  useObtenerResumenDatasetQuery,
  useListarTodasQuery,
  useListarMuestraDatasetQuery,
  useListarClasificadasQuery,
  useListarClasificacionesQuery,
  useCrearClasificacionMutation,
  useEliminarClasificacionMutation,
} = datasetApi;
