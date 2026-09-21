import { Button } from "@mui/material";

import { useEliminarClasificacionMutation } from "../datasetApi";

export function AccionRecuperarDescarte({ clasificacionId, onQuitar }: { clasificacionId: string; onQuitar?: () => void }) {
  const [eliminar, { isLoading }] = useEliminarClasificacionMutation();

  return (
    <Button
      size="small"
      color="inherit"
      variant="outlined"
      disabled={isLoading}
      onClick={() => {
        onQuitar?.();
        eliminar(clasificacionId);
      }}
    >
      Recuperar (a pendientes)
    </Button>
  );
}
