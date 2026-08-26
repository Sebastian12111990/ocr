import { apiSlice } from "@/app/store/apiSlice";
import type { RespuestaCatalogo } from "./catalogo.types";

export const catalogoApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    obtenerCatalogo: builder.query<RespuestaCatalogo, void>({
      query: () => "catalogo",
      providesTags: ["Catalogo"],
    }),
  }),
});

export const { useObtenerCatalogoQuery } = catalogoApi;
