import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import type { OpcionAutocomplete } from "@/shared/componentes/rhf";
import type { VistaDataset } from "../dataset.types";

export const VISTAS: VistaDataset[] = [
  "todas",
  "vehiculo_con_patente",
  "solo_patente",
  "vehiculo_sin_patente",
  "sin_deteccion",
  "pendiente",
  "aceptada",
  "descartada",
];

const CLAVE_FILTROS_GUARDADOS = "dataset:filtros";

interface FiltrosGuardados {
  vista: VistaDataset;
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  etiquetaFiltro: string;
  confianzaMinPct: number | "";
  confianzaMaxPct: number | "";
}

const VALORES_POR_DEFECTO: FiltrosDatasetForm = {
  planta: null,
  fechaDesde: "",
  fechaHasta: "",
  etiquetaFiltro: null,
  confianzaMinPct: "",
  confianzaMaxPct: "",
};

export interface OpcionFiltro extends OpcionAutocomplete {
  code: string;
  name: string;
}

export interface FiltrosDatasetForm {
  planta: OpcionFiltro | null;
  fechaDesde: string;
  fechaHasta: string;
  etiquetaFiltro: OpcionFiltro | null;
  confianzaMinPct: number | "";
  confianzaMaxPct: number | "";
}

/** Estado compuesto plano: lo que le importa a la consulta de imágenes, no cómo se editó. */
export interface FiltrosDataset {
  vista: VistaDataset;
  planta: string;
  fechaDesde: string;
  fechaHasta: string;
  etiquetaFiltro: string;
  confianzaMin: number | undefined;
  confianzaMax: number | undefined;
}

function leerFiltrosGuardados(): Partial<FiltrosGuardados> {
  try {
    const crudo = localStorage.getItem(CLAVE_FILTROS_GUARDADOS);
    const filtros = crudo
      ? (JSON.parse(crudo) as Partial<FiltrosGuardados>)
      : {};
    if (filtros.vista && !VISTAS.includes(filtros.vista)) delete filtros.vista;
    return filtros;
  } catch {
    return {};
  }
}

/** Dueño del formulario de filtros del dataset: valores, persistencia en localStorage y la regla
 * "cambiar de planta invalida el rango de fechas elegido" (pertenecía a la planta anterior). */
export function useFiltrosDataset() {
  const [filtrosIniciales] = useState(leerFiltrosGuardados);
  const [vista, setVista] = useState<VistaDataset>(filtrosIniciales.vista ?? "todas");

  const methods = useForm<FiltrosDatasetForm>({
    defaultValues: {
      planta: filtrosIniciales.planta
        ? { code: filtrosIniciales.planta, name: filtrosIniciales.planta }
        : null,
      fechaDesde: filtrosIniciales.fechaDesde ?? "",
      fechaHasta: filtrosIniciales.fechaHasta ?? "",
      etiquetaFiltro: filtrosIniciales.etiquetaFiltro
        ? {
            code: filtrosIniciales.etiquetaFiltro,
            name: filtrosIniciales.etiquetaFiltro,
          }
        : null,
      confianzaMinPct: filtrosIniciales.confianzaMinPct ?? "",
      confianzaMaxPct: filtrosIniciales.confianzaMaxPct ?? "",
    },
  });

  const plantaOpcion = useWatch({ control: methods.control, name: "planta" });
  const fechaDesde = useWatch({ control: methods.control, name: "fechaDesde" });
  const fechaHasta = useWatch({ control: methods.control, name: "fechaHasta" });
  const etiquetaOpcion = useWatch({
    control: methods.control,
    name: "etiquetaFiltro",
  });
  const confianzaMinPct = useWatch({
    control: methods.control,
    name: "confianzaMinPct",
  });
  const confianzaMaxPct = useWatch({
    control: methods.control,
    name: "confianzaMaxPct",
  });

  const planta = plantaOpcion?.code ?? "";
  const etiquetaFiltro = etiquetaOpcion?.code ?? "";
  const confianzaMin = confianzaMinPct !== "" ? confianzaMinPct / 100 : undefined;
  const confianzaMax = confianzaMaxPct !== "" ? confianzaMaxPct / 100 : undefined;

  // Comparar contra el valor anterior real de `planta` (no un ref "¿ya monté?") es inmune al
  // doble-invoke de efectos que hace React StrictMode en dev: con el patrón "saltar el primer
  // render", la segunda invocación del mismo mount ve el ref ya en `true` y termina limpiando la
  // fecha en cada carga de página, aunque la planta no haya cambiado — eso rompía la persistencia.
  const plantaAnterior = useRef(planta);
  useEffect(() => {
    if (plantaAnterior.current === planta) return;
    plantaAnterior.current = planta;
    methods.setValue("fechaDesde", "");
    methods.setValue("fechaHasta", "");
  }, [planta, methods]);

  useEffect(() => {
    try {
      const filtros: FiltrosGuardados = {
        vista,
        planta,
        fechaDesde,
        fechaHasta,
        etiquetaFiltro,
        confianzaMinPct,
        confianzaMaxPct,
      };
      localStorage.setItem(CLAVE_FILTROS_GUARDADOS, JSON.stringify(filtros));
    } catch {
      // No crítico — si falla, simplemente no persiste entre recargas.
    }
  }, [vista, planta, fechaDesde, fechaHasta, etiquetaFiltro, confianzaMinPct, confianzaMaxPct]);

  const limpiarFiltros = useCallback(() => {
    methods.reset(VALORES_POR_DEFECTO);
  }, [methods]);

  const filtros: FiltrosDataset = {
    vista,
    planta,
    fechaDesde,
    fechaHasta,
    etiquetaFiltro,
    confianzaMin,
    confianzaMax,
  };

  const hayFiltrosActivos =
    planta !== "" ||
    fechaDesde !== "" ||
    fechaHasta !== "" ||
    etiquetaFiltro !== "" ||
    confianzaMinPct !== "" ||
    confianzaMaxPct !== "";

  return { methods, filtros, setVista, limpiarFiltros, hayFiltrosActivos };
}
