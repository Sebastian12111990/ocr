import { apiSlice } from "@/app/store/apiSlice";
import type { Pipeline } from "@/features/editor/pipeline.types";
import type { Candidato } from "./candidatos.types";

export interface SolicitudCandidatos {
  imagenId: string;
  pipeline: Pipeline;
  limite?: number;
}

export const candidatosApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    obtenerCandidatos: builder.mutation<{ candidatos: Candidato[] }, SolicitudCandidatos>({
      query: (cuerpo) => ({ url: "candidatos", method: "POST", body: cuerpo }),
    }),
  }),
});

export const { useObtenerCandidatosMutation } = candidatosApi;
