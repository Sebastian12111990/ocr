import { useState } from "react";
import type { MouseEvent } from "react";
import { Button, Chip, Menu, MenuItem } from "@mui/material";

import { useCrearClasificacionMutation, useEliminarClasificacionMutation } from "../datasetApi";
import type { ClasificacionImagen, ImagenDataset, MotivoCasoDificil } from "../dataset.types";

const ETIQUETAS_MOTIVO: Record<MotivoCasoDificil, string> = {
  brillo: "Brillo",
  suciedad: "Suciedad",
  otro: "Otro",
};

export function AccionCasoDificil({ imagen, clasificacion }: { imagen: ImagenDataset; clasificacion?: ClasificacionImagen }) {
  const [anclaMenu, setAnclaMenu] = useState<HTMLElement | null>(null);
  const [clasificar, { isLoading: guardando }] = useCrearClasificacionMutation();
  const [eliminar, { isLoading: eliminando }] = useEliminarClasificacionMutation();

  if (clasificacion) {
    return (
      <Chip
        size="small"
        color="warning"
        variant="outlined"
        label={`Caso difícil: ${ETIQUETAS_MOTIVO[clasificacion.motivo ?? "otro"]}`}
        onDelete={eliminando ? undefined : () => eliminar(clasificacion.id)}
      />
    );
  }

  const abrirMenu = (evento: MouseEvent<HTMLElement>) => setAnclaMenu(evento.currentTarget);
  const cerrarMenu = () => setAnclaMenu(null);

  const elegirMotivo = (motivo: MotivoCasoDificil) => {
    clasificar({ nombreArchivo: imagen.nombre, origen: imagen.origen, perspectiva: "caso_dificil", motivo });
    cerrarMenu();
  };

  return (
    <>
      <Button size="small" variant="outlined" disabled={guardando} onClick={abrirMenu}>
        Marcar caso difícil
      </Button>
      <Menu anchorEl={anclaMenu} open={Boolean(anclaMenu)} onClose={cerrarMenu}>
        {(Object.keys(ETIQUETAS_MOTIVO) as MotivoCasoDificil[]).map((motivo) => (
          <MenuItem key={motivo} onClick={() => elegirMotivo(motivo)}>
            {ETIQUETAS_MOTIVO[motivo]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
