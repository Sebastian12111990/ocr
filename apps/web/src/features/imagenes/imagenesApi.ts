import { apiSlice } from "@/app/store/apiSlice";
import type { Imagen } from "./imagenes.types";

export const imagenesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listarImagenes: builder.query<Imagen[], void>({
      query: () => "imagenes",
      providesTags: ["Imagenes"],
    }),
  }),
});

export const { useListarImagenesQuery } = imagenesApi;
