import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";

import LoadingScreen from "@/shared/componentes/loading/LoadingScreen";

const EntrenamientosPage = lazy(() =>
  import("@/features/entrenamientos/pages/EntrenamientosPage").then((modulo) => ({
    default: modulo.EntrenamientosPage,
  })),
);

export const rutaEntrenamientos = {
  raiz: "/entrenamientos",
  conTipo: (tipo: string) => `/entrenamientos?tipo=${tipo}`,
} as const;

export const entrenamientosRoutes: RouteObject[] = [
  {
    path: rutaEntrenamientos.raiz,
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <EntrenamientosPage />
      </Suspense>
    ),
  },
];
