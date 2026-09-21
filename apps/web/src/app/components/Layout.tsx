import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";

import { BarraLateral } from "./BarraLateral";

export function Layout() {
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <BarraLateral />
      <Box component="main" sx={{ flex: 1, minWidth: 0, height: "100%" }}>
        <Outlet />
      </Box>
    </Box>
  );
}
