import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * Slice base de RTK Query: sin endpoints propios. Cada feature los inyecta
 * con `apiSlice.injectEndpoints(...)` — ver `features/<slice>/*Api.ts`.
 */
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Catalogo", "Imagenes", "Presets", "Ejecuciones"],
  endpoints: () => ({}),
});
