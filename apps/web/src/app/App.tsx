import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";

import { EditorPage } from "@/features/editor/pages/EditorPage";
import { theme } from "./theme";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <EditorPage />
    </ThemeProvider>
  );
}
