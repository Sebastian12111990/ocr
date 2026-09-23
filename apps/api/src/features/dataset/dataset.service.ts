import path from "node:path";

import { inject, injectable } from "inversify";
import { In, IsNull, Not, type Repository, type SelectQueryBuilder } from "typeorm";

import { DeteccionImagen } from "./deteccion-imagen.entidad.js";
import { EtiquetaImagen } from "./etiqueta-imagen.entidad.js";
import { ImagenDataset } from "./imagen-dataset.entidad.js";
import { TipoEtiqueta } from "./tipo-etiqueta.entidad.js";
import type {
  FilaDeteccionCsv,
  FiltrosListarImagenes,
  FiltrosResumenDataset,
  ImagenDatasetResumida,
  PaginaImagenesDataset,
  ResultadoCargaDetecciones,
  ResumenDataset,
  TipoEtiquetaResumen,
  VeredictoDeteccion,
  VistaDataset,
} from "./dataset.types.js";
import { TIPOS } from "../../contenedor/tipos.js";
import { entorno } from "../../config/env.js";
import { ErrorConflicto, ErrorNoEncontrado, ErrorValidacion } from "../../shared/http/error-aplicacion.js";

/** Ver docs/decisiones-modelo-dataset.md — "el criterio" de las vistas calculadas. */
export const CLASES_VEHICULO = ["car", "truck", "bus", "motorcycle"];
export const CLASE_PATENTE = "patente";

const VISTAS: VistaDataset[] = [
  "todas",
  "con_patente",
  "vehiculo_sin_patente",
  "sin_vehiculo_con_patente",
  "sin_deteccion",
];

const EXISTE_VEHICULO =
  "exists (select 1 from deteccion_imagen dv where dv.imagen_id = imagen.id and dv.clase in (:...clasesVehiculo))";
const EXISTE_PATENTE =
  "exists (select 1 from deteccion_imagen dp where dp.imagen_id = imagen.id and dp.clase = :clasePatente)";

const TAMANO_LOTE_CARGA = 1000;

@injectable()
export class ServicioDataset {
  private readonly raiz = entorno.RUTA_IMAGENES_DATASET;

  constructor(
    @inject(TIPOS.RepositorioImagenDataset) private readonly repositorioImagenes: Repository<ImagenDataset>,
    @inject(TIPOS.RepositorioTipoEtiqueta) private readonly repositorioTipos: Repository<TipoEtiqueta>,
    @inject(TIPOS.RepositorioEtiquetaImagen) private readonly repositorioEtiquetas: Repository<EtiquetaImagen>,
    @inject(TIPOS.RepositorioDeteccionImagen) private readonly repositorioDetecciones: Repository<DeteccionImagen>,
  ) {}

  /**
   * Sin filtros cuenta sobre todo el dataset; con `planta`/`fechaDesde`/`fechaHasta`/etiqueta
   * cuenta solo sobre ese subconjunto — así las pestañas reflejan el filtro activo en la vista.
   */
  async obtenerResumen(filtros: FiltrosResumenDataset = {}): Promise<ResumenDataset> {
    const base = { vista: "todas" as const, ...filtros };

    const queryPorVista = this.construirQueryBase(base)
      .select("count(*)", "total")
      .addSelect(`count(*) filter (where ${EXISTE_PATENTE})`, "con_patente")
      .addSelect(`count(*) filter (where ${EXISTE_VEHICULO} and not ${EXISTE_PATENTE})`, "vehiculo_sin_patente")
      .addSelect(`count(*) filter (where not ${EXISTE_VEHICULO} and ${EXISTE_PATENTE})`, "sin_vehiculo_con_patente")
      .addSelect(`count(*) filter (where not ${EXISTE_VEHICULO} and not ${EXISTE_PATENTE})`, "sin_deteccion")
      .setParameters({ clasePatente: CLASE_PATENTE, clasesVehiculo: CLASES_VEHICULO });

    // porPlanta siempre lista todas las plantas sin filtrar (ni por planta ni por fecha): si se
    // filtrara por fecha, el select de "Planta" perdería la opción elegida en cuanto no tuviera
    // imágenes en ese rango — MUI la muestra en blanco aunque el estado siga siendo válido.
    const [totalImagenes, porPlantaCrudo, porVistaCrudo, porEtiquetaCrudo, modelosCrudo] = await Promise.all([
      this.construirQueryBase(base).getCount(),
      this.repositorioImagenes
        .createQueryBuilder("imagen")
        .select("imagen.planta", "planta")
        .addSelect("count(*)", "total")
        .groupBy("imagen.planta")
        .getRawMany<{ planta: string | null; total: string }>(),
      queryPorVista.getRawOne<Record<VistaDataset, string> & { total: string }>(),
      this.repositorioEtiquetas
        .createQueryBuilder("etiqueta")
        .select("etiqueta.tipoClave", "clave")
        .addSelect("count(*)", "total")
        .groupBy("etiqueta.tipoClave")
        .getRawMany<{ clave: string; total: string }>(),
      this.repositorioDetecciones
        .createQueryBuilder("deteccion")
        .select("distinct deteccion.modelo", "modelo")
        .orderBy("deteccion.modelo", "ASC")
        .getRawMany<{ modelo: string }>(),
    ]);

    const porVista = Object.fromEntries(VISTAS.map((vista) => [vista, Number(porVistaCrudo?.[vista] ?? 0)])) as Record<
      VistaDataset,
      number
    >;
    porVista.todas = totalImagenes;

    return {
      totalImagenes,
      porPlanta: porPlantaCrudo.map((fila) => ({ planta: fila.planta, total: Number(fila.total) })),
      porVista,
      porEtiqueta: porEtiquetaCrudo.map((fila) => ({ clave: fila.clave, total: Number(fila.total) })),
      modelos: modelosCrudo.map((fila) => fila.modelo),
      actualizadoEn: new Date().toISOString(),
    };
  }

  /** Un día por fila: cuántas imágenes hay y cuántas ya tienen alguna detección cargada (de
   * cualquier modelo) — para marcar en el calendario qué días tienen datos y cuáles ya se procesaron. */
  async listarFechas(planta: string): Promise<{ fecha: string; total: number; procesadas: number }[]> {
    const filas = await this.repositorioImagenes
      .createQueryBuilder("imagen")
      .select("to_char(imagen.fecha, 'YYYY-MM-DD')", "fecha")
      .addSelect("count(*)", "total")
      .addSelect(
        "count(*) filter (where exists (select 1 from deteccion_imagen d where d.imagen_id = imagen.id))",
        "procesadas",
      )
      .where("imagen.planta = :planta", { planta })
      .andWhere("imagen.fecha is not null")
      .groupBy("imagen.fecha")
      .orderBy("imagen.fecha", "ASC")
      .getRawMany<{ fecha: string; total: string; procesadas: string }>();

    return filas.map((fila) => ({ fecha: fila.fecha, total: Number(fila.total), procesadas: Number(fila.procesadas) }));
  }

  async listarTiposEtiqueta(): Promise<TipoEtiquetaResumen[]> {
    const tipos = await this.repositorioTipos.find({
      where: { activa: true },
      order: { familia: "ASC", orden: "ASC" },
    });
    return tipos.map((tipo) => ({ clave: tipo.clave, nombre: tipo.nombre, familia: tipo.familia, orden: tipo.orden }));
  }

  async listarImagenes(filtros: FiltrosListarImagenes): Promise<PaginaImagenesDataset> {
    const base = this.construirQueryBase(filtros);
    const total = await base.clone().getCount();

    const pagina = base
      .clone()
      .orderBy("imagen.rutaRelativa", "ASC")
      .take(filtros.limite + 1);
    if (filtros.cursor) pagina.andWhere("imagen.rutaRelativa > :cursor", { cursor: filtros.cursor });

    const filas = await pagina.getMany();
    const hayMas = filas.length > filtros.limite;
    const filasPagina = hayMas ? filas.slice(0, filtros.limite) : filas;
    const siguienteCursor = hayMas ? filasPagina[filasPagina.length - 1].rutaRelativa : null;

    const ids = filasPagina.map((fila) => fila.id);
    const [cajas, etiquetas] = await Promise.all([
      ids.length ? this.repositorioDetecciones.find({ where: { imagenId: In(ids) } }) : [],
      ids.length ? this.repositorioEtiquetas.find({ where: { imagenId: In(ids) } }) : [],
    ]);

    const cajasPorImagen = agruparPor(cajas, (caja) => caja.imagenId);
    const etiquetasPorImagen = agruparPor(etiquetas, (etiqueta) => etiqueta.imagenId);

    const imagenes: ImagenDatasetResumida[] = filasPagina.map((fila) => ({
      id: fila.id,
      rutaRelativa: fila.rutaRelativa,
      planta: fila.planta,
      fecha: fila.fecha,
      ancho: fila.ancho,
      alto: fila.alto,
      cajas: (cajasPorImagen.get(fila.id) ?? []).map((caja) => ({
        id: caja.id,
        modelo: caja.modelo,
        clase: caja.clase,
        confianza: caja.confianza,
        xc: caja.xc,
        yc: caja.yc,
        ancho: caja.ancho,
        alto: caja.alto,
        veredicto: caja.veredicto,
      })),
      etiquetas: (etiquetasPorImagen.get(fila.id) ?? []).map((etiqueta) => ({
        clave: etiqueta.tipoClave,
        origen: etiqueta.origen,
        nota: etiqueta.nota,
      })),
    }));

    return { imagenes, total, siguienteCursor };
  }

  async obtenerRutaImagen(id: string): Promise<string> {
    const imagen = await this.repositorioImagenes.findOneBy({ id });
    if (!imagen) throw new ErrorNoEncontrado(`No existe la imagen: ${id}`);

    const ruta = path.resolve(this.raiz, imagen.rutaRelativa);
    const raizResuelta = path.resolve(this.raiz);
    if (!ruta.startsWith(raizResuelta + path.sep)) {
      throw new ErrorValidacion("Ruta de imagen fuera de la raíz del dataset");
    }
    return ruta;
  }

  /** Toggle idempotente: crear o actualizar la nota de una etiqueta ya asignada. */
  async asignarEtiqueta(imagenId: string, tipoClave: string, nota: string | null): Promise<void> {
    const [imagen, tipo] = await Promise.all([
      this.repositorioImagenes.findOneBy({ id: imagenId }),
      this.repositorioTipos.findOneBy({ clave: tipoClave }),
    ]);
    if (!imagen) throw new ErrorNoEncontrado(`No existe la imagen: ${imagenId}`);
    if (!tipo) throw new ErrorNoEncontrado(`No existe el tipo de etiqueta: ${tipoClave}`);

    await this.repositorioEtiquetas.upsert(
      { imagenId, tipoClave, origen: "manual", nota },
      { conflictPaths: ["imagenId", "tipoClave"] },
    );
  }

  /** Idempotente: quitar una etiqueta que ya no existe no es un error. */
  async quitarEtiqueta(imagenId: string, tipoClave: string): Promise<void> {
    await this.repositorioEtiquetas.delete({ imagenId, tipoClave });
  }

  async fijarVeredicto(deteccionId: string, veredicto: VeredictoDeteccion | null): Promise<void> {
    const resultado = await this.repositorioDetecciones.update({ id: deteccionId }, { veredicto });
    if (!resultado.affected) throw new ErrorNoEncontrado(`No existe la detección: ${deteccionId}`);
  }

  private construirQueryBase(
    filtros: Omit<FiltrosListarImagenes, "cursor" | "limite">,
  ): SelectQueryBuilder<ImagenDataset> {
    const qb = this.repositorioImagenes.createQueryBuilder("imagen");

    if (filtros.planta) qb.andWhere("imagen.planta = :planta", { planta: filtros.planta });
    if (filtros.fechaDesde) qb.andWhere("imagen.fecha >= :fechaDesde", { fechaDesde: filtros.fechaDesde });
    if (filtros.fechaHasta) qb.andWhere("imagen.fecha <= :fechaHasta", { fechaHasta: filtros.fechaHasta });
    if (filtros.etiqueta) {
      qb.andWhere(
        `exists (select 1 from etiqueta_imagen ei where ei.imagen_id = imagen.id and ei.tipo_clave = :etiquetaFiltro)`,
        { etiquetaFiltro: filtros.etiqueta },
      );
    }
    if (filtros.sinEtiqueta) {
      qb.andWhere(
        `not exists (select 1 from etiqueta_imagen ei2 where ei2.imagen_id = imagen.id and ei2.tipo_clave = :sinEtiquetaFiltro)`,
        { sinEtiquetaFiltro: filtros.sinEtiqueta },
      );
    }

    this.aplicarFiltroVista(qb, filtros.vista);
    return qb;
  }

  private aplicarFiltroVista(qb: SelectQueryBuilder<ImagenDataset>, vista: VistaDataset): void {
    if (vista === "todas") return;

    if (vista === "con_patente") {
      qb.andWhere(EXISTE_PATENTE, { clasePatente: CLASE_PATENTE });
      return;
    }
    if (vista === "vehiculo_sin_patente") {
      qb.andWhere(EXISTE_VEHICULO, { clasesVehiculo: CLASES_VEHICULO }).andWhere(`not ${EXISTE_PATENTE}`, {
        clasePatente: CLASE_PATENTE,
      });
      return;
    }
    if (vista === "sin_vehiculo_con_patente") {
      qb.andWhere(`not ${EXISTE_VEHICULO}`, { clasesVehiculo: CLASES_VEHICULO }).andWhere(EXISTE_PATENTE, {
        clasePatente: CLASE_PATENTE,
      });
      return;
    }
    qb.andWhere(`not ${EXISTE_VEHICULO}`, { clasesVehiculo: CLASES_VEHICULO }).andWhere(`not ${EXISTE_PATENTE}`, {
      clasePatente: CLASE_PATENTE,
    });
  }

  /**
   * Carga un lote de detecciones de un modelo. Con `reemplazar: true` borra solo las filas de
   * `deteccion_imagen` cuyo `imagen_id` está en `filas` (no todo el modelo) — re-procesar un
   * subconjunto (una planta/rango) no debe tocar detecciones de otras imágenes ya cargadas con
   * el mismo modelo. Se niega si alguna de esas filas ya tiene veredicto humano.
   */
  async cargarDetecciones(
    filas: FilaDeteccionCsv[],
    modelo: string,
    opciones: { reemplazar: boolean },
  ): Promise<ResultadoCargaDetecciones> {
    if (filas.length === 0) return { cargadas: 0, sinImagen: 0 };

    const idsPorRuta = new Map(
      (await this.repositorioImagenes.find({ select: { id: true, rutaRelativa: true } })).map((imagen) => [
        imagen.rutaRelativa,
        imagen.id,
      ]),
    );

    const filasConImagen: { imagenId: string; fila: FilaDeteccionCsv }[] = [];
    let sinImagen = 0;
    for (const fila of filas) {
      const imagenId = idsPorRuta.get(fila.rutaRelativa);
      if (!imagenId) {
        sinImagen += 1;
        continue;
      }
      filasConImagen.push({ imagenId, fila });
    }
    const idsImagenes = filasConImagen.map((f) => f.imagenId);

    if (idsImagenes.length > 0 && !opciones.reemplazar) {
      const existentes = await this.repositorioDetecciones.count({ where: { modelo, imagenId: In(idsImagenes) } });
      if (existentes > 0) {
        throw new ErrorConflicto(
          `Ya hay ${existentes} detecciones del modelo "${modelo}" para estas imágenes. Pasá reemplazar para reemplazarlas.`,
        );
      }
    }

    await this.repositorioImagenes.manager.transaction(async (manager) => {
      if (opciones.reemplazar && idsImagenes.length > 0) {
        const conVeredicto = await manager.count(DeteccionImagen, {
          where: { modelo, imagenId: In(idsImagenes), veredicto: Not(IsNull()) },
        });
        if (conVeredicto > 0) {
          throw new ErrorConflicto(
            `${conVeredicto} detecciones del modelo "${modelo}" en este subconjunto ya tienen veredicto humano — no se reemplazan.`,
          );
        }
        await manager.delete(DeteccionImagen, { modelo, imagenId: In(idsImagenes) });
      }

      for (let i = 0; i < filasConImagen.length; i += TAMANO_LOTE_CARGA) {
        const lote = filasConImagen.slice(i, i + TAMANO_LOTE_CARGA).map(({ imagenId, fila }) =>
          manager.create(DeteccionImagen, {
            imagenId,
            modelo,
            clase: fila.clase,
            confianza: fila.confianza,
            xc: fila.xc,
            yc: fila.yc,
            ancho: fila.ancho,
            alto: fila.alto,
            veredicto: null,
          }),
        );
        await manager.insert(DeteccionImagen, lote);
      }
    });

    return { cargadas: filasConImagen.length, sinImagen };
  }
}

function agruparPor<T, K>(items: T[], clave: (item: T) => K): Map<K, T[]> {
  const mapa = new Map<K, T[]>();
  for (const item of items) {
    const k = clave(item);
    const grupo = mapa.get(k);
    if (grupo) grupo.push(item);
    else mapa.set(k, [item]);
  }
  return mapa;
}
