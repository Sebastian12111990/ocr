import type { EtapaPipeline, ValorParametro } from "../editor/pipeline.types";

/** Espejo de `services/cv/dominio/catalogo.py`: una sola fuente de verdad,
 * el frontend renderiza sus controles a partir de este metadato. */
export interface ParametroCatalogo {
  nombre: string;
  etiqueta: string;
  tipo: "number" | "enum" | "boolean";
  defecto: ValorParametro;
  minimo?: number;
  maximo?: number;
  paso?: number;
  solo_impares?: boolean;
  opciones?: string[];
}

export interface EtapaCatalogo {
  tipo: string;
  etiqueta: string;
  categoria: string;
  entrada: "gris" | "color" | "cualquiera";
  salida: "gris" | "color";
  orden_fijo: number | null;
  parametros: ParametroCatalogo[];
}

export interface RespuestaCatalogo {
  etapas: EtapaCatalogo[];
  pipeline_por_defecto: EtapaPipeline[];
}
