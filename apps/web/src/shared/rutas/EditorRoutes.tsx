import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";

import LoadingScreen from "@/shared/componentes/loading/LoadingScreen";

const EditorPage = lazy(() =>
  import("@/features/editor/pages/EditorPage").then((modulo) => ({ default: modulo.EditorPage })),
);

export const rutaEditor = {
  raiz: "/",
} as const;

export const editorRoutes: RouteObject[] = [
  {
    path: rutaEditor.raiz,
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <EditorPage />
      </Suspense>
    ),
  },
];
