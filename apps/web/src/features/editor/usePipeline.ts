import { useEffect, useState } from "react";

import type { EtapaCatalogo, RespuestaCatalogo } from "../catalogo/catalogo.types";
import type { EtapaPipeline, ModoPipeline, ValorParametro } from "./pipeline.types";

/**
 * Estado del pipeline en edición. Modo fijo y modo libre se guardan por
 * separado para que alternar entre ellos no se pierda lo que se armó en el
 * otro — son dos borradores independientes del mismo contrato.
 */
export function usePipeline(catalogo: RespuestaCatalogo | undefined) {
  const [modo, setModo] = useState<ModoPipeline>("fijo");
  const [etapasFijo, setEtapasFijo] = useState<EtapaPipeline[]>([]);
  const [etapasLibre, setEtapasLibre] = useState<EtapaPipeline[]>([]);

  useEffect(() => {
    if (catalogo && etapasFijo.length === 0) {
      setEtapasFijo(catalogo.pipeline_por_defecto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogo]);

  const etapas = modo === "fijo" ? etapasFijo : etapasLibre;
  const setEtapas = modo === "fijo" ? setEtapasFijo : setEtapasLibre;

  function alternarActiva(indice: number): void {
    setEtapas((previas) =>
      previas.map((etapa, i) => (i === indice ? { ...etapa, activa: !etapa.activa } : etapa)),
    );
  }

  function actualizarParametro(indice: number, nombre: string, valor: ValorParametro): void {
    setEtapas((previas) =>
      previas.map((etapa, i) =>
        i === indice ? { ...etapa, parametros: { ...etapa.parametros, [nombre]: valor } } : etapa,
      ),
    );
  }

  function agregarEtapa(definicion: EtapaCatalogo): void {
    const nueva: EtapaPipeline = {
      tipo: definicion.tipo,
      activa: true,
      parametros: Object.fromEntries(definicion.parametros.map((p) => [p.nombre, p.defecto])),
    };
    setEtapasLibre((previas) => [...previas, nueva]);
  }

  function quitarEtapa(indice: number): void {
    setEtapasLibre((previas) => previas.filter((_, i) => i !== indice));
  }

  function reordenar(desde: number, hasta: number): void {
    setEtapasLibre((previas) => {
      const copia = [...previas];
      const [movida] = copia.splice(desde, 1);
      if (movida) copia.splice(hasta, 0, movida);
      return copia;
    });
  }

  return {
    modo,
    setModo,
    etapas,
    alternarActiva,
    actualizarParametro,
    agregarEtapa,
    quitarEtapa,
    reordenar,
  };
}
