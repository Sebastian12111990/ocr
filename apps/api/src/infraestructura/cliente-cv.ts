import { injectable } from "inversify";

import { entorno } from "../config/env.js";
import { ErrorServicioExterno } from "../shared/http/error-aplicacion.js";
import type { EtapaPipeline } from "../shared/contrato/pipeline.js";

export interface ImagenInfoCv {
  nombre_archivo: string;
  ruta_relativa: string;
  ancho: number | null;
  alto: number | null;
}

export interface ResultadoOcrCv {
  texto: string;
  confianza: number;
}

/** Cliente HTTP hacia `services/cv` (FastAPI). Nunca lo llama el navegador. */
@injectable()
export class ClienteCv {
  private readonly base = entorno.URL_SERVICIO_CV;

  async obtenerCatalogo(): Promise<unknown> {
    return this.obtenerJson("/catalogo");
  }

  async listarImagenes(): Promise<ImagenInfoCv[]> {
    return this.obtenerJson("/imagenes") as Promise<ImagenInfoCv[]>;
  }

  async procesar(ruta: string, etapas: EtapaPipeline[], signal?: AbortSignal): Promise<Buffer> {
    const respuesta = await this.enviarJson("/procesar", { ruta, etapas }, signal);
    return Buffer.from(await respuesta.arrayBuffer());
  }

  async ejecutarOcr(
    ruta: string,
    etapas: EtapaPipeline[],
    signal?: AbortSignal,
  ): Promise<ResultadoOcrCv> {
    const respuesta = await this.enviarJson("/ocr", { ruta, etapas }, signal);
    return (await respuesta.json()) as ResultadoOcrCv;
  }

  private async obtenerJson(ruta: string): Promise<unknown> {
    const respuesta = await fetch(`${this.base}${ruta}`);
    if (!respuesta.ok) {
      throw new ErrorServicioExterno(await this.mensajeError(respuesta), 502);
    }
    return respuesta.json();
  }

  private async enviarJson(ruta: string, cuerpo: unknown, signal?: AbortSignal): Promise<Response> {
    const respuesta = await fetch(`${this.base}${ruta}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
      signal,
    });
    if (!respuesta.ok) {
      // 502 salvo que el servicio de visión ya haya calificado el error (404/400/503) — se propaga tal cual
      const codigo = [400, 404, 503].includes(respuesta.status) ? respuesta.status : 502;
      throw new ErrorServicioExterno(await this.mensajeError(respuesta), codigo);
    }
    return respuesta;
  }

  private async mensajeError(respuesta: Response): Promise<string> {
    try {
      const cuerpo = (await respuesta.clone().json()) as { detail?: string };
      return cuerpo.detail ?? `Error del servicio de visión (${respuesta.status})`;
    } catch {
      return `Error del servicio de visión (${respuesta.status})`;
    }
  }
}
