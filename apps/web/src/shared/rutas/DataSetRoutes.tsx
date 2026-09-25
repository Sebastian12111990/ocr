import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";

import LoadingScreen from "@/shared/componentes/loading/LoadingScreen";

const DatasetPage = lazy(() =>
  import("@/features/dataset/pages/DatasetPage").then((modulo) => ({ default: modulo.DatasetPage })),
);

export const rutaDataset = {
  raiz: "/dataset",
} as const;

export const dataSetRoutes: RouteObject[] = [
  {
    path: rutaDataset.raiz,
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <DatasetPage />
      </Suspense>
    ),
  },
];
