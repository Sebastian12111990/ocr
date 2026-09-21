import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { DatasetPage } from "@/features/dataset/pages/DatasetPage";
import { EditorPage } from "@/features/editor/pages/EditorPage";
import { EntrenamientosPage } from "@/features/entrenamientos/pages/EntrenamientosPage";
import { Layout } from "./components/Layout";
import { theme } from "./theme";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<EditorPage />} />
            <Route path="/entrenamientos" element={<EntrenamientosPage />} />
            <Route path="/dataset" element={<DatasetPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
