import { useEffect, useState } from "react";

import type { EtapaCatalogo, RespuestaCatalogo } from "../catalogo/catalogo.types";
import type { EtapaPipeline, ModoPipeline, Pipeline, ValorParametro } from "./pipeline.types";

const CLAVE_BORRADOR_LIBRE = "ocr.pipeline.modo-libre.v1";
const CLAVE_PIPELINE_FIJO = "ocr.pipeline.modo-fijo.v1";
const CLAVE_MODO = "ocr.pipeline.modo-activo.v1";
let secuenciaIdentidades = 0;

function crearIdentidadEtapa(): string {
  secuenciaIdentidades += 1;
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${secuenciaIdentidades}`;
}

function moverElemento<T>(elementos: T[], desde: number, hasta: number): T[] {
  const copia = [...elementos];
  const [movido] = copia.splice(desde, 1);
  if (movido !== undefined) copia.splice(hasta, 0, movido);
  return copia;
}

function cargarEtapas(clave: string): EtapaPipeline[] {
  try {
    const guardado = localStorage.getItem(clave);
    if (!guardado) return [];

    const valor: unknown = JSON.parse(guardado);
    if (!Array.isArray(valor)) return [];

    return valor.filter(
      (etapa): etapa is EtapaPipeline =>
        typeof etapa === "object" &&
        etapa !== null &&
        typeof etapa.tipo === "string" &&
        typeof etapa.activa === "boolean" &&
        typeof etapa.parametros === "object" &&
        etapa.parametros !== null,
    );
  } catch {
    return [];
  }
}

function cargarModo(): ModoPipeline {
  try {
    return localStorage.getItem(CLAVE_MODO) === "libre" ? "libre" : "fijo";
  } catch {
    return "fijo";
  }
}

function copiarEtapas(etapas: EtapaPipeline[]): EtapaPipeline[] {
  return etapas.map((etapa) => ({
    ...etapa,
    parametros: { ...etapa.parametros },
  }));
}

/**
 * Estado del pipeline en edición. Modo fijo y modo libre se guardan por
 * separado para que alternar entre ellos no se pierda lo que se armó en el
 * otro — son dos borradores independientes del mismo contrato.
 */
export function usePipeline(catalogo: RespuestaCatalogo | undefined) {
  const [modo, setModo] = useState<ModoPipeline>(cargarModo);
  const [etapasFijo, setEtapasFijo] = useState<EtapaPipeline[]>(() => cargarEtapas(CLAVE_PIPELINE_FIJO));
  const [etapasLibre, setEtapasLibre] = useState<EtapaPipeline[]>(() => cargarEtapas(CLAVE_BORRADOR_LIBRE));
  const [identidadesEtapasLibre, setIdentidadesEtapasLibre] = useState<string[]>(() =>
    cargarEtapas(CLAVE_BORRADOR_LIBRE).map(() => crearIdentidadEtapa()),
  );

  useEffect(() => {
    if (catalogo && etapasFijo.length === 0) {
      setEtapasFijo(catalogo.pipeline_por_defecto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogo]);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_BORRADOR_LIBRE, JSON.stringify(etapasLibre));
    } catch {
      // La edición sigue funcionando aunque el navegador bloquee localStorage.
    }
  }, [etapasLibre]);

  useEffect(() => {
    if (etapasFijo.length === 0) return;
    try {
      localStorage.setItem(CLAVE_PIPELINE_FIJO, JSON.stringify(etapasFijo));
    } catch {
      // La edición sigue funcionando aunque el navegador bloquee localStorage.
    }
  }, [etapasFijo]);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_MODO, modo);
    } catch {
      // La edición sigue funcionando aunque el navegador bloquee localStorage.
    }
  }, [modo]);

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
    setIdentidadesEtapasLibre((previas) => [...previas, crearIdentidadEtapa()]);
  }

  function quitarEtapa(indice: number): void {
    setEtapasLibre((previas) => previas.filter((_, i) => i !== indice));
    setIdentidadesEtapasLibre((previas) => previas.filter((_, i) => i !== indice));
  }

  function cargarEtapasLibres(etapasGuardadas: EtapaPipeline[]): void {
    const copia = etapasGuardadas.map((etapa) => ({
      ...etapa,
      parametros: { ...etapa.parametros },
    }));
    setEtapasLibre(copia);
    setIdentidadesEtapasLibre(copia.map(() => crearIdentidadEtapa()));
    setModo("libre");
    try {
      localStorage.setItem(CLAVE_BORRADOR_LIBRE, JSON.stringify(copia));
      localStorage.setItem(CLAVE_MODO, "libre");
    } catch {
      // React mantiene el borrador cargado aunque localStorage no esté disponible.
    }
  }

  function cargarPipeline(pipelineGuardado: Pipeline): void {
    const copia = copiarEtapas(pipelineGuardado.etapas);
    if (pipelineGuardado.modo === "fijo") setEtapasFijo(copia);
    else {
      setEtapasLibre(copia);
      setIdentidadesEtapasLibre(copia.map(() => crearIdentidadEtapa()));
    }
    setModo(pipelineGuardado.modo);

    try {
      localStorage.setItem(
        pipelineGuardado.modo === "fijo" ? CLAVE_PIPELINE_FIJO : CLAVE_BORRADOR_LIBRE,
        JSON.stringify(copia),
      );
      localStorage.setItem(CLAVE_MODO, pipelineGuardado.modo);
    } catch {
      // El estado de React conserva el pipeline aunque localStorage no esté disponible.
    }
  }

  function reordenar(desde: number, hasta: number): void {
    setEtapasLibre((previas) => moverElemento(previas, desde, hasta));
    setIdentidadesEtapasLibre((previas) => moverElemento(previas, desde, hasta));
  }

  return {
    modo,
    setModo,
    etapas,
    etapasLibre,
    identidadesEtapasLibre,
    alternarActiva,
    actualizarParametro,
    agregarEtapa,
    quitarEtapa,
    cargarEtapasLibres,
    cargarPipeline,
    reordenar,
  };
}
