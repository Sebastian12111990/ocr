import type { RouteObject } from "react-router-dom";

import { dataSetRoutes, rutaDataset } from "./DataSetRoutes";
import { editorRoutes, rutaEditor } from "./EditorRoutes";
import { entrenamientosRoutes, rutaEntrenamientos } from "./EntrenamientosRoutes";

export const rutas = {
  editor: rutaEditor,
  dataset: rutaDataset,
  entrenamientos: rutaEntrenamientos,
} as const;

export const configuracionRutas: RouteObject[] = [...editorRoutes, ...dataSetRoutes, ...entrenamientosRoutes];
