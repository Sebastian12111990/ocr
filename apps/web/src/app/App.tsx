import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { configuracionRutas } from "@/shared/rutas";
import { UkoThemeProvider } from "@/theme";
import { Layout } from "./components/Layout";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: configuracionRutas,
  },
]);

export default function App() {
  return (
    <UkoThemeProvider>
      <RouterProvider router={router} />
    </UkoThemeProvider>
  );
}
