import { Box, Container, useMediaQuery } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Outlet } from "react-router-dom";

import {
  ANCHO_BARRA_COMPACTA,
  ANCHO_BARRA_LATERAL,
  BarraLateral,
  BarraLateralMovil,
} from "./BarraLateral";
import { Encabezado } from "./Encabezado";
import { LayoutProvider, useLayout } from "./LayoutContext";

const CuerpoLayout = styled("div", {
  shouldForwardProp: (prop) => prop !== "compacta",
})<{ compacta: boolean }>(({ theme, compacta }) => ({
  minWidth: 0,
  minHeight: "100vh",
  marginInlineStart: compacta ? ANCHO_BARRA_COMPACTA : ANCHO_BARRA_LATERAL,
  backgroundColor: theme.palette.background.default,
  transition: "margin 300ms ease-in-out",
  [theme.breakpoints.down("lg")]: { marginInlineStart: 0 },
}));

function ContenidoLayout() {
  const theme = useMediaQuery((tema) => tema.breakpoints.down("lg"));
  const { sidebarCompacta } = useLayout();

  return (
    <>
      {theme ? <BarraLateralMovil /> : <BarraLateral />}
      <CuerpoLayout compacta={sidebarCompacta}>
        <Container
          maxWidth={false}
          disableGutters
          sx={{ height: "100vh", display: "flex", flexDirection: "column" }}
        >
          <Encabezado />
          <Box component="main" sx={{ flex: 1, minHeight: 0 }}>
            <Outlet />
          </Box>
        </Container>
      </CuerpoLayout>
    </>
  );
}

export function Layout() {
  return (
    <LayoutProvider>
      <ContenidoLayout />
    </LayoutProvider>
  );
}
