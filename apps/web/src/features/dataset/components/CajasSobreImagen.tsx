import { Box } from "@mui/material";

import { urlImagenDataset } from "../datasetApi";
import { cajasPatente } from "../dataset.types";
import type { CajaDeteccion, ImagenDatasetResumida } from "../dataset.types";

const COLOR_VEREDICTO: Record<string, "success.main" | "error.main" | "warning.main"> = {
  correcta: "success.main",
  falso_positivo: "error.main",
};

export interface FiltroConfianza {
  clase: string;
  min?: number;
  max?: number;
}

/** El punteado/atenuado es para decir "esta caja es la razón por la que la imagen está en esta
 * lista, pero no cumple el rango" — solo tiene sentido en cajas de la MISMA clase que el filtro.
 * Una caja de otra clase (p.ej. "truck" cuando el filtro es "patente") es simplemente ajena al
 * filtro, no "una patente fuera de rango": se muestra normal, o si no se confunde con la que sí
 * importa. */
function cajaCoincideConFiltro(caja: CajaDeteccion, filtro: FiltroConfianza | undefined): boolean {
  if (!filtro) return true;
  if (caja.clase !== filtro.clase) return true;
  if (filtro.min != null && caja.confianza < filtro.min) return false;
  if (filtro.max != null && caja.confianza > filtro.max) return false;
  return true;
}

interface Props {
  imagen: ImagenDatasetResumida;
  /** Si viene, atenúa las cajas que NO son de esta clase/rango — la imagen puede calificar por
   * una sola caja (p.ej. la patente), pero sigue mostrando todas las demás; sin esto se
   * confunden con la que realmente importa. */
  filtroConfianza?: FiltroConfianza;
  /** Sin esto las cajas quedan solo informativas (modal de detalle en preview por hover). */
  onClicCaja?: (caja: CajaDeteccion) => void;
}

/** aspectRatio real por imagen (no un 4/3 fijo) + objectFit "contain": las cajas en % del
 * contenedor solo caen sobre la patente si el contenedor tiene la misma proporción que la
 * imagen — con "cover" se recortaba y quedaban desalineadas. El cálculo es en % del contenedor,
 * así que el mismo componente sirve para la tarjeta chica de la galería y el modal de detalle
 * grande (ver GaleriaImagenes / ModalDetalleImagen). */
export function CajasSobreImagen({ imagen, filtroConfianza, onClicCaja }: Props) {
  const cajas = cajasPatente(imagen.cajas);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: `${imagen.ancho} / ${imagen.alto}`,
        bgcolor: "background.default",
      }}
    >
      <Box
        component="img"
        src={urlImagenDataset(imagen.id)}
        alt={imagen.rutaRelativa}
        loading="lazy"
        sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
      {cajas.map((caja, indiceCaja) => {
        const coincide = cajaCoincideConFiltro(caja, filtroConfianza);
        return (
          <Box
            key={caja.id}
            onClick={
              onClicCaja
                ? (evento) => {
                    evento.stopPropagation();
                    onClicCaja(caja);
                  }
                : undefined
            }
            title={`${caja.clase} (${(caja.confianza * 100).toFixed(0)}%)${onClicCaja ? " — click para marcar veredicto" : ""}`}
            sx={{
              position: "absolute",
              left: `${(caja.xc - caja.ancho / 2) * 100}%`,
              top: `${(caja.yc - caja.alto / 2) * 100}%`,
              width: `${caja.ancho * 100}%`,
              height: `${caja.alto * 100}%`,
              // Las cajas más chicas (patentes lejanas, 15x9px reales) quedan de pocos píxeles en
              // una miniatura — imposibles de acertar con el mouse. El mínimo agranda el área de
              // click sin mover el punto central, no pretende seguir siendo el contorno exacto.
              minWidth: onClicCaja ? 14 : undefined,
              minHeight: onClicCaja ? 14 : undefined,
              border: "2px solid",
              borderColor: caja.veredicto ? COLOR_VEREDICTO[caja.veredicto] : "warning.main",
              borderStyle: coincide ? "solid" : "dashed",
              borderRadius: 0.5,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
              opacity: coincide ? 1 : 0.35,
              cursor: onClicCaja ? "pointer" : "default",
            }}
          >
            {/* Numeradas solo si hay más de una caja: son la referencia visual de las teclas
             * 1-9 para ciclar veredicto sin mouse (ver useAtajosGaleria, que numera igual). */}
            {cajas.length > 1 && (
              <Box
                sx={{
                  position: "absolute",
                  top: -1,
                  left: -1,
                  minWidth: 16,
                  height: 16,
                  px: 0.25,
                  bgcolor: caja.veredicto ? COLOR_VEREDICTO[caja.veredicto] : "warning.main",
                  color: "common.white",
                  fontSize: 10,
                  lineHeight: "16px",
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                {indiceCaja + 1}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
