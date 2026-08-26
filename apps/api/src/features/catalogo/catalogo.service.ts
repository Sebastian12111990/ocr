import { inject, injectable } from "inversify";

import { ClienteCv } from "../../infraestructura/cliente-cv.js";
import { TIPOS } from "../../contenedor/tipos.js";

const TIEMPO_DE_VIDA_CACHE_MS = 60_000;

@injectable()
export class ServicioCatalogo {
  private cache: { datos: unknown; expiraEn: number } | null = null;

  constructor(@inject(TIPOS.ClienteCv) private readonly clienteCv: ClienteCv) {}

  async obtener(): Promise<unknown> {
    const ahora = Date.now();
    if (this.cache && this.cache.expiraEn > ahora) {
      return this.cache.datos;
    }
    const datos = await this.clienteCv.obtenerCatalogo();
    this.cache = { datos, expiraEn: ahora + TIEMPO_DE_VIDA_CACHE_MS };
    return datos;
  }
}
