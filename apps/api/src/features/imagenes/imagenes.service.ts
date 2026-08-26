import { inject, injectable } from "inversify";
import type { Repository } from "typeorm";

import { Imagen } from "./imagen.entidad.js";
import { ClienteCv } from "../../infraestructura/cliente-cv.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { ErrorNoEncontrado } from "../../shared/http/error-aplicacion.js";
import { derivarPatenteEsperada } from "../../shared/utils/texto.js";

@injectable()
export class ServicioImagenes {
  constructor(
    @inject(TIPOS.RepositorioImagen) private readonly repositorio: Repository<Imagen>,
    @inject(TIPOS.ClienteCv) private readonly clienteCv: ClienteCv,
  ) {}

  async listar(): Promise<Imagen[]> {
    return this.repositorio.find({ order: { nombreArchivo: "ASC" } });
  }

  async obtenerPorId(id: string): Promise<Imagen> {
    const imagen = await this.repositorio.findOneBy({ id });
    if (!imagen) throw new ErrorNoEncontrado(`No existe la imagen: ${id}`);
    return imagen;
  }

  /** Escanea `services/cv` (que a su vez lee `computer vision/patentes`) y sincroniza la tabla. */
  async sincronizar(): Promise<Imagen[]> {
    const imagenesCv = await this.clienteCv.listarImagenes();

    for (const info of imagenesCv) {
      if (info.ancho === null || info.alto === null) continue;

      const existente = await this.repositorio.findOneBy({ nombreArchivo: info.nombre_archivo });
      const datos: Partial<Imagen> = {
        nombreArchivo: info.nombre_archivo,
        rutaRelativa: info.ruta_relativa,
        ancho: info.ancho,
        alto: info.alto,
        patenteEsperada: derivarPatenteEsperada(info.nombre_archivo),
      };

      if (existente) {
        await this.repositorio.update(existente.id, datos);
      } else {
        await this.repositorio.insert(datos);
      }
    }

    return this.listar();
  }
}
