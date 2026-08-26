import { apiSlice } from "@/app/store/apiSlice";
import type { Pipeline } from "./pipeline.types";

export interface SolicitudProcesar {
  imagenId: string;
  pipeline: Pipeline;
}

export const editorApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /** Devuelve el PNG procesado como Blob (no JSON: evita el +33% de base64). */
    procesar: builder.mutation<Blob, SolicitudProcesar>({
      query: (cuerpo) => ({
        url: "procesar",
        method: "POST",
        body: cuerpo,
        responseHandler: (respuesta: Response) => respuesta.blob(),
      }),
    }),
  }),
});

export const { useProcesarMutation } = editorApi;
