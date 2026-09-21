import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Collapse,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsightsIcon from "@mui/icons-material/Insights";
import RadarIcon from "@mui/icons-material/Radar";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ModelTrainingIcon from "@mui/icons-material/ModelTraining";

export const ANCHO_BARRA_LATERAL = 220;

interface SubItem {
  etiqueta: string;
  tipo: string;
  icono: React.ReactNode;
}

const SUBITEMS_ENTRENAMIENTOS: SubItem[] = [
  { etiqueta: "Todos", tipo: "", icono: <InsightsIcon fontSize="small" /> },
  { etiqueta: "Sondeos", tipo: "sondeo", icono: <RadarIcon fontSize="small" /> },
  { etiqueta: "Auto-etiquetado", tipo: "auto_etiquetado", icono: <AutoAwesomeIcon fontSize="small" /> },
  { etiqueta: "Entrenamientos", tipo: "entrenamiento", icono: <ModelTrainingIcon fontSize="small" /> },
];

export function BarraLateral() {
  const location = useLocation();
  const navigate = useNavigate();
  const enEntrenamientos = location.pathname.startsWith("/entrenamientos");
  const [abierto, setAbierto] = useState(enEntrenamientos);

  const tipoActivo = new URLSearchParams(location.search).get("tipo") ?? "";

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: ANCHO_BARRA_LATERAL,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: ANCHO_BARRA_LATERAL,
          boxSizing: "border-box",
          borderRight: 1,
          borderColor: "divider",
        },
      }}
    >
      <Toolbar variant="dense">
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          OCR patentes
        </Typography>
      </Toolbar>
      <Divider />
      <List dense sx={{ pt: 1 }}>
        <ListItemButton selected={location.pathname === "/"} onClick={() => navigate("/")}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <EditNoteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Editor" />
        </ListItemButton>

        <ListItemButton selected={location.pathname === "/dataset"} onClick={() => navigate("/dataset")}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <FolderOpenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Dataset" />
        </ListItemButton>

        <ListItemButton
          selected={enEntrenamientos && !abierto}
          onClick={() => {
            setAbierto((valor) => !valor);
            if (!enEntrenamientos) navigate("/entrenamientos");
          }}
        >
          <ListItemIcon sx={{ minWidth: 34 }}>
            <InsightsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Entrenamientos" />
          {abierto ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </ListItemButton>

        <Collapse in={abierto} timeout="auto" unmountOnExit>
          <List dense disablePadding>
            {SUBITEMS_ENTRENAMIENTOS.map((item) => (
              <ListItemButton
                key={item.etiqueta}
                sx={{ pl: 4.5 }}
                selected={enEntrenamientos && tipoActivo === item.tipo}
                onClick={() => navigate(item.tipo ? `/entrenamientos?tipo=${item.tipo}` : "/entrenamientos")}
              >
                <ListItemIcon sx={{ minWidth: 30 }}>{item.icono}</ListItemIcon>
                <ListItemText primary={item.etiqueta} slotProps={{ primary: { variant: "body2" } }} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      </List>
    </Drawer>
  );
}
