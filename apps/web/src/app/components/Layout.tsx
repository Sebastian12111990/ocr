import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";

import { ANCHO_BARRA_LATERAL, BarraLateral } from "./BarraLateral";

export function Layout() {
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <BarraLateral />
      <Box component="main" sx={{ flexGrow: 1, height: "100%", ml: `${ANCHO_BARRA_LATERAL}px` }}>
        <Outlet />
      </Box>
    </Box>
  );
}
