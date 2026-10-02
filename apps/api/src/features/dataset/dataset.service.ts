import path from "node:path";

import { inject, injectable } from "inversify";
import { In, IsNull, Not, type Repository, type SelectQueryBuilder, type UpdateQueryBuilder } from "typeorm";

import { DeteccionImagen } from "./deteccion-imagen.entidad.js";
import { EtiquetaImagen } from "./etiqueta-imagen.entidad.js";
import { ImagenDataset } from "./imagen-dataset.entidad.js";
import { TipoEtiqueta } from "./tipo-etiqueta.entidad.js";
import type {
  EstadisticasTamanoPatente,
  FechaDataset,
  FilaDeteccionCsv,
  FiltrosAceptarPorConfianza,
  FiltrosAceptarTodas,
  FiltrosDescartarPendientes,
  FiltrosDescartarPorForma,
  FiltrosDescartarPorTamanoRelativo,
  FiltrosEstadisticasTamanoPatente,
  FiltrosListarImagenes,
  FiltrosResumenDataset,
  ImagenDatasetResumida,
  ImagenParaEntrenar,
  PaginaImagenesDataset,
  PrevisualizacionAceptarPorConfianza,
  PrevisualizacionAceptarTodas,
  PrevisualizacionDescartarPendientes,
  PrevisualizacionDescartarPorForma,
  PrevisualizacionDescartarPorTamanoRelativo,
  ResultadoAceptarPorConfianza,
  ResultadoAceptarTodas,
  ResultadoCargaDetecciones,
  ResultadoDescartarPendientes,
  ResultadoDescartarPorForma,
  ResultadoDescartarPorTamanoRelativo,
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
export const CLAVE_REVISADA = "revisada";
export const CLAVE_DESCARTADA = "descartada";
const NOTA_DESCARTE_EN_BLOQUE = "descartar_todas_pendientes";

const VISTAS: VistaDataset[] = [
  "todas",
  "vehiculo_con_patente",
  "solo_patente",
  "vehiculo_sin_patente",
  "sin_deteccion",
  "pendiente",
  "aceptada",
  "descartada",
];

const EXISTE_VEHICULO =
  "exists (select 1 from deteccion_imagen dv where dv.imagen_id = imagen.id and dv.clase in (:...clasesVehiculo))";
const EXISTE_PATENTE =
  "exists (select 1 from deteccion_imagen dp where dp.imagen_id = imagen.id and dp.clase = :clasePatente)";
/** A diferencia de las otras vistas (que particionan por tipo de detección), esta corta
 * transversal: una imagen descartada puede ser de cualquier tipo — es la misma etiqueta
 * `CLAVE_DESCARTADA` que ya gatea `LISTA_PARA_ENTRENAR`, ahora expuesta como pestaña para poder
 * auditar rápido qué quedó afuera del entrenamiento. */
const EXISTE_DESCARTADA =
  "exists (select 1 from etiqueta_imagen ede where ede.imagen_id = imagen.id and ede.tipo_clave = :claveDescartadaVista)";
const EXISTE_REVISADA =
  "exists (select 1 from etiqueta_imagen eri where eri.imagen_id = imagen.id and eri.tipo_clave = :claveRevisadaVista)";

/** Regla de elegibilidad para entrenar: revisada a mano y no descartada. Decisión explícita del
 * usuario (no exigir además "sin cajas de patente con veredicto pendiente"): una caja que
 * quedó pendiente en una imagen ya revisada se exporta igual que si no existiera (no entra al
 * .txt de labels) — si esa caja pendiente era una patente real, el modelo la aprende como fondo. */
const LISTA_PARA_ENTRENAR = `(
  exists (select 1 from etiqueta_imagen eli where eli.imagen_id = imagen.id and eli.tipo_clave = :claveRevisada)
  and not exists (select 1 from etiqueta_imagen eld where eld.imagen_id = imagen.id and eld.tipo_clave = :claveDescartada)
)`;

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
      .addSelect(`count(*) filter (where ${EXISTE_VEHICULO} and ${EXISTE_PATENTE})`, "vehiculo_con_patente")
      .addSelect(`count(*) filter (where not ${EXISTE_VEHICULO} and ${EXISTE_PATENTE})`, "solo_patente")
      .addSelect(`count(*) filter (where ${EXISTE_VEHICULO} and not ${EXISTE_PATENTE})`, "vehiculo_sin_patente")
      .addSelect(`count(*) filter (where not ${EXISTE_VEHICULO} and not ${EXISTE_PATENTE})`, "sin_deteccion")
      .addSelect(`count(*) filter (where ${EXISTE_DESCARTADA})`, "descartada")
      .addSelect(`count(*) filter (where ${LISTA_PARA_ENTRENAR})`, "lista_para_entrenar")
      .setParameters({
        clasePatente: CLASE_PATENTE,
        clasesVehiculo: CLASES_VEHICULO,
        claveRevisada: CLAVE_REVISADA,
        claveDescartada: CLAVE_DESCARTADA,
        claveDescartadaVista: CLAVE_DESCARTADA,
      });

    // Cajas de patente (ya deduplicadas por modelo más reciente, ver condicionModeloMasReciente):
    // cuántas tienen veredicto humano puesto vs. cuántas siguen pendientes — el umbral de
    // confianza de "aceptar por confianza" solo decide qué se acepta EN BLOQUE, nunca saca una
    // caja de la revisión; este contador hace visible cuánto queda sin mirar de verdad, esté
    // arriba o debajo de cualquier umbral.
    const queryCajasPatente = this.repositorioDetecciones
      .createQueryBuilder("deteccion")
      .innerJoin("imagen_dataset", "img", "img.id = deteccion.imagen_id")
      .where("deteccion.clase = :clasePatenteResumen", { clasePatenteResumen: CLASE_PATENTE })
      .andWhere(condicionModeloMasReciente("deteccion"));
    if (base.planta) queryCajasPatente.andWhere("img.planta = :plantaResumen", { plantaResumen: base.planta });
    if (base.fechaDesde) {
      queryCajasPatente.andWhere("img.fecha >= :fechaDesdeResumen", { fechaDesdeResumen: base.fechaDesde });
    }
    if (base.fechaHasta) {
      queryCajasPatente.andWhere("img.fecha <= :fechaHastaResumen", { fechaHastaResumen: base.fechaHasta });
    }
    if (base.etiqueta) {
      queryCajasPatente.andWhere(
        `exists (select 1 from etiqueta_imagen eir where eir.imagen_id = img.id and eir.tipo_clave = :etiquetaResumen)`,
        { etiquetaResumen: base.etiqueta },
      );
    }
    queryCajasPatente
      .select("count(*)", "total")
      .addSelect("count(*) filter (where deteccion.veredicto is not null)", "con_veredicto");

    // porPlanta siempre lista todas las plantas sin filtrar (ni por planta ni por fecha): si se
    // filtrara por fecha, el select de "Planta" perdería la opción elegida en cuanto no tuviera
    // imágenes en ese rango — MUI la muestra en blanco aunque el estado siga siendo válido.
    const [totalImagenes, porPlantaCrudo, porVistaCrudo, porEtiquetaCrudo, modelosCrudo, cajasPatenteCrudo] =
      await Promise.all([
        this.construirQueryBase(base).getCount(),
        this.repositorioImagenes
          .createQueryBuilder("imagen")
          .select("imagen.planta", "planta")
          .addSelect("count(*)", "total")
          .groupBy("imagen.planta")
          .getRawMany<{ planta: string | null; total: string }>(),
        queryPorVista.getRawOne<Record<VistaDataset, string> & { total: string; lista_para_entrenar: string }>(),
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
        queryCajasPatente.getRawOne<{ total: string; con_veredicto: string }>(),
      ]);

    const porVista = Object.fromEntries(VISTAS.map((vista) => [vista, Number(porVistaCrudo?.[vista] ?? 0)])) as Record<
      VistaDataset,
      number
    >;
    porVista.todas = totalImagenes;
    // Mismo criterio que LISTA_PARA_ENTRENAR (ver aplicarFiltroVista) — se reusa el conteo ya
    // calculado como "lista_para_entrenar" en vez de repetir el filter en el SQL.
    porVista.aceptada = Number(porVistaCrudo?.lista_para_entrenar ?? 0);
    // "Pendiente" = ni aceptada ni descartada — no necesita su propio filter en el SQL, es lo que
    // sobra del total (revisada/descartada son mutuamente excluyentes, ver useGaleriaDataset).
    porVista.pendiente = totalImagenes - porVista.aceptada - porVista.descartada;

    const cajasPatenteTotal = Number(cajasPatenteCrudo?.total ?? 0);
    const cajasPatenteConVeredicto = Number(cajasPatenteCrudo?.con_veredicto ?? 0);

    return {
      totalImagenes,
      porPlanta: porPlantaCrudo.map((fila) => ({ planta: fila.planta, total: Number(fila.total) })),
      porVista,
      porEtiqueta: porEtiquetaCrudo.map((fila) => ({ clave: fila.clave, total: Number(fila.total) })),
      modelos: modelosCrudo.map((fila) => fila.modelo),
      imagenesListasParaEntrenar: Number(porVistaCrudo?.lista_para_entrenar ?? 0),
      cajasPatente: {
        total: cajasPatenteTotal,
        conVeredicto: cajasPatenteConVeredicto,
        pendientes: cajasPatenteTotal - cajasPatenteConVeredicto,
      },
      actualizadoEn: new Date().toISOString(),
    };
  }

  /** Un día por fila: cuántas imágenes hay y cuántas ya tienen alguna detección cargada (de
   * cualquier modelo) — para marcar en el calendario qué días tienen datos y cuáles ya se procesaron. */
  async listarFechas(planta: string): Promise<FechaDataset[]> {
    const filas = await this.repositorioImagenes
      .createQueryBuilder("imagen")
      .select("to_char(imagen.fecha, 'YYYY-MM-DD')", "fecha")
      .addSelect("count(*)", "total")
      .addSelect(
        "count(*) filter (where exists (select 1 from deteccion_imagen d where d.imagen_id = imagen.id))",
        "procesadas",
      )
      // Mismo criterio que la vista "pendiente": ni aceptada ni descartada.
      .addSelect(`count(*) filter (where not ${EXISTE_REVISADA} and not ${EXISTE_DESCARTADA})`, "pendientes")
      .where("imagen.planta = :planta", { planta })
      .andWhere("imagen.fecha is not null")
      .setParameters({ claveRevisadaVista: CLAVE_REVISADA, claveDescartadaVista: CLAVE_DESCARTADA })
      .groupBy("imagen.fecha")
      .orderBy("imagen.fecha", "ASC")
      .getRawMany<{ fecha: string; total: string; procesadas: string; pendientes: string }>();

    return filas.map((fila) => ({
      fecha: fila.fecha,
      total: Number(fila.total),
      procesadas: Number(fila.procesadas),
      pendientes: Number(fila.pendientes),
    }));
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

    const imagenes = await this.mapearImagenes(filasPagina);
    return { imagenes, total, siguienteCursor };
  }

  /** Las imágenes candidatas a "Descartar por forma" — para poder mirarlas con el recuadro
   * dibujado (mismos controles que la galería) antes de aplicar el bulk-write a ciegas. */
  async listarImagenesDescartarPorForma(filtros: FiltrosDescartarPorForma): Promise<ImagenDatasetResumida[]> {
    const idsCrudo = await this.queryFormaAnomala(filtros)
      .select("distinct deteccion.imagen_id", "imagenId")
      .getRawMany<{ imagenId: string }>();
    const ids = idsCrudo.map((fila) => fila.imagenId);
    if (ids.length === 0) return [];

    const filas = await this.repositorioImagenes.find({ where: { id: In(ids) }, order: { rutaRelativa: "ASC" } });
    return this.mapearImagenes(filas);
  }

  /** Las imágenes candidatas a "Descartar por tamaño relativo" — misma idea que la de forma. */
  async listarImagenesDescartarPorTamanoRelativo(
    filtros: FiltrosDescartarPorTamanoRelativo,
  ): Promise<ImagenDatasetResumida[]> {
    const idsCrudo = await this.queryTamanoRelativoAnomalo(filtros)
      .select("distinct deteccion.imagen_id", "imagenId")
      .getRawMany<{ imagenId: string }>();
    const ids = idsCrudo.map((fila) => fila.imagenId);
    if (ids.length === 0) return [];

    const filas = await this.repositorioImagenes.find({ where: { id: In(ids) }, order: { rutaRelativa: "ASC" } });
    return this.mapearImagenes(filas);
  }

  /** Cajas + etiquetas de un lote de imágenes, ya deduplicadas por modelo más reciente —
   * compartido por `listarImagenes` y las vistas de auditoría (candidatas a bulk-write). */
  private async mapearImagenes(filas: ImagenDataset[]): Promise<ImagenDatasetResumida[]> {
    const ids = filas.map((fila) => fila.id);
    const [cajasCrudas, etiquetas] = await Promise.all([
      ids.length ? this.repositorioDetecciones.find({ where: { imagenId: In(ids) } }) : [],
      ids.length ? this.repositorioEtiquetas.find({ where: { imagenId: In(ids) } }) : [],
    ]);
    const cajas = soloModeloMasRecientePorGrupo(cajasCrudas);

    const cajasPorImagen = agruparPor(cajas, (caja) => caja.imagenId);
    const etiquetasPorImagen = agruparPor(etiquetas, (etiqueta) => etiqueta.imagenId);

    return filas.map((fila) => ({
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

  /** Imágenes elegibles para entrenar (ver LISTA_PARA_ENTRENAR) junto con sus cajas confirmadas
   * (`veredicto = 'correcta'`) de las clases pedidas — las únicas que se exportan como labels;
   * las `falso_positivo` y las pendientes se omiten (quedan como fondo). Usado por
   * ServicioExportadorDataset, no por la UI. */
  async listarImagenesParaEntrenar(clases: string[]): Promise<ImagenParaEntrenar[]> {
    const imagenes = await this.repositorioImagenes
      .createQueryBuilder("imagen")
      .where(LISTA_PARA_ENTRENAR, { claveRevisada: CLAVE_REVISADA, claveDescartada: CLAVE_DESCARTADA })
      .getMany();

    const ids = imagenes.map((imagen) => imagen.id);
    const cajas = ids.length
      ? await this.repositorioDetecciones.find({
          where: { imagenId: In(ids), clase: In(clases), veredicto: "correcta" },
        })
      : [];
    const cajasPorImagen = agruparPor(cajas, (caja) => caja.imagenId);

    return imagenes.map((imagen) => ({
      imagenId: imagen.id,
      rutaRelativa: imagen.rutaRelativa,
      planta: imagen.planta,
      fecha: imagen.fecha,
      ancho: imagen.ancho,
      alto: imagen.alto,
      cajas: (cajasPorImagen.get(imagen.id) ?? []).map((caja) => ({
        clase: caja.clase,
        xc: caja.xc,
        yc: caja.yc,
        ancho: caja.ancho,
        alto: caja.alto,
      })),
    }));
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
    const deteccion = await this.repositorioDetecciones.findOneBy({ id: deteccionId });
    if (!deteccion) throw new ErrorNoEncontrado(`No existe la detección: ${deteccionId}`);

    await this.repositorioDetecciones.update({ id: deteccionId }, { veredicto });

    if (veredicto === null) {
      // Volvió a quedar pendiente: si "Revisada" se había puesto sola (no a mano), ya no aplica.
      await this.repositorioEtiquetas.delete({ imagenId: deteccion.imagenId, tipoClave: CLAVE_REVISADA, origen: "modelo" });
    } else {
      await this.marcarRevisadaSiSinPendientes([deteccion.imagenId]);
    }
  }

  /** Etiqueta "Revisada" (origen `modelo`, para distinguirla de una puesta a mano) a las imágenes
   * de `imagenIds` cuyas cajas de patente (modelo más reciente) ya no tienen ninguna pendiente —
   * aceptar/descartar la última caja de patente de una imagen equivale a terminar de revisarla.
   * Nunca pisa una "Revisada" puesta a mano (`origen: 'manual'`), y es idempotente (upsert). */
  private async marcarRevisadaSiSinPendientes(imagenIds: string[]): Promise<void> {
    if (imagenIds.length === 0) return;

    const conPendientes = await this.repositorioDetecciones
      .createQueryBuilder("deteccion")
      .select("distinct deteccion.imagen_id", "imagenId")
      .where("deteccion.imagen_id in (:...imagenIds)", { imagenIds })
      .andWhere("deteccion.clase = :clasePatenteRevisada", { clasePatenteRevisada: CLASE_PATENTE })
      .andWhere("deteccion.veredicto is null")
      .andWhere(condicionModeloMasReciente("deteccion"))
      .getRawMany<{ imagenId: string }>();
    const idsConPendientes = new Set(conPendientes.map((fila) => fila.imagenId));
    const idsCompletos = imagenIds.filter((id) => !idsConPendientes.has(id));
    if (idsCompletos.length === 0) return;

    const yaManual = await this.repositorioEtiquetas.find({
      where: { imagenId: In(idsCompletos), tipoClave: CLAVE_REVISADA, origen: "manual" },
      select: { imagenId: true },
    });
    const idsManual = new Set(yaManual.map((etiqueta) => etiqueta.imagenId));
    const idsAEtiquetar = idsCompletos.filter((id) => !idsManual.has(id));
    if (idsAEtiquetar.length === 0) return;

    await this.repositorioEtiquetas.upsert(
      idsAEtiquetar.map((imagenId) => ({ imagenId, tipoClave: CLAVE_REVISADA, origen: "modelo" as const, nota: null })),
      { conflictPaths: ["imagenId", "tipoClave"] },
    );
  }

  /** Ejecuta un UPDATE de `deteccion_imagen` ya armado (where/set puestos) pidiendo de vuelta los
   * `imagen_id` afectados, para poder marcar "Revisada" sola en las que quedaron sin cajas de
   * patente pendientes — compartido por los 4 bulk-write de veredicto. */
  private async ejecutarBulkVeredicto(qb: UpdateQueryBuilder<DeteccionImagen>): Promise<number> {
    const resultado = await qb.returning("imagen_id").execute();
    const idsAfectados = Array.from(
      new Set((resultado.raw as { imagen_id: string }[]).map((fila) => fila.imagen_id)),
    );
    await this.marcarRevisadaSiSinPendientes(idsAfectados);
    return resultado.affected ?? 0;
  }

  /** Tasa de acierto ESTIMADA a partir de cajas del mismo rango de confianza que un humano ya
   * revisó — no es una garantía, es la mejor evidencia disponible antes de aceptar en masa. */
  async previsualizarAceptarPorConfianza(filtros: FiltrosAceptarPorConfianza): Promise<PrevisualizacionAceptarPorConfianza> {
    const candidatos = await this.queryRangoConfianza(filtros).andWhere("deteccion.veredicto is null").getCount();
    const revisadas = await this.queryRangoConfianza(filtros)
      .andWhere("deteccion.veredicto is not null")
      .getMany();
    const correctas = revisadas.filter((deteccion) => deteccion.veredicto === "correcta").length;

    return {
      candidatos,
      revisadasEnRango: revisadas.length,
      correctasEnRango: correctas,
      tasaAciertoEstimada: revisadas.length > 0 ? correctas / revisadas.length : null,
    };
  }

  /** Marca como 'correcta' todas las cajas pendientes en el rango — bulk write irreversible sin
   * volver a tocarlas una por una. Solo toca `veredicto is null`, nunca pisa una ya adjudicada. */
  async aceptarPorConfianza(filtros: FiltrosAceptarPorConfianza): Promise<ResultadoAceptarPorConfianza> {
    const { sql, params } = this.condicionRangoConfianza(filtros);
    const qb = this.repositorioDetecciones
      .createQueryBuilder()
      .update(DeteccionImagen)
      .set({ veredicto: "correcta" })
      .where(sql, params)
      .andWhere("veredicto is null")
      .andWhere(condicionModeloMasReciente(""));

    const condicionImagen = this.condicionImagenEnRango("imagen_id", filtros);
    if (condicionImagen) qb.andWhere(condicionImagen.sql, condicionImagen.params);

    return { actualizadas: await this.ejecutarBulkVeredicto(qb) };
  }

  /** Cuántas cajas pendientes tienen una forma físicamente imposible para una patente (relación
   * ancho/alto fuera del rango elegido) — candidatas a "Descartar por forma". */
  async previsualizarDescartarPorForma(filtros: FiltrosDescartarPorForma): Promise<PrevisualizacionDescartarPorForma> {
    const candidatos = await this.queryFormaAnomala(filtros).getCount();
    return { candidatos };
  }

  /** Marca 'falso_positivo' en bloque las cajas pendientes con forma imposible — solo toca
   * `veredicto is null`, nunca pisa una ya adjudicada (mismo criterio que las otras bulk). */
  async descartarPorForma(filtros: FiltrosDescartarPorForma): Promise<ResultadoDescartarPorForma> {
    const { sql, params } = this.condicionFormaAnomala(filtros);
    const qb = this.repositorioDetecciones
      .createQueryBuilder()
      .update(DeteccionImagen)
      .set({ veredicto: "falso_positivo" })
      .where(sql, params)
      .andWhere("veredicto is null")
      .andWhere(condicionModeloMasReciente(""));

    const condicionImagen = this.condicionImagenEnRango("imagen_id", filtros);
    if (condicionImagen) qb.andWhere(condicionImagen.sql, condicionImagen.params);

    return { actualizadas: await this.ejecutarBulkVeredicto(qb) };
  }

  private condicionFormaAnomala(filtros: FiltrosDescartarPorForma): { sql: string; params: Record<string, unknown> } {
    let sql = "clase = :claseForma and (ancho / alto < :relacionMin or ancho / alto > :relacionMax)";
    const params: Record<string, unknown> = {
      claseForma: filtros.clase,
      relacionMin: filtros.relacionMin,
      relacionMax: filtros.relacionMax,
    };
    // Verificado en la práctica: forma rara + confianza ALTA suele ser una patente real con la
    // caja mal regresionada (p.ej. buses donde se mete en el paragolpe), no un falso positivo —
    // exigir además confianza baja evita repetir ese error.
    if (filtros.confianzaMax != null) {
      sql += " and confianza <= :confianzaMaxForma";
      params.confianzaMaxForma = filtros.confianzaMax;
    }
    return { sql, params };
  }

  private queryFormaAnomala(filtros: FiltrosDescartarPorForma): SelectQueryBuilder<DeteccionImagen> {
    const { sql, params } = this.condicionFormaAnomala(filtros);
    const qb = this.repositorioDetecciones
      .createQueryBuilder("deteccion")
      .where(sql, params)
      .andWhere("deteccion.veredicto is null")
      .andWhere(condicionModeloMasReciente("deteccion"));
    const condicionImagen = this.condicionImagenEnRango("deteccion.imagen_id", filtros);
    if (condicionImagen) qb.andWhere(condicionImagen.sql, condicionImagen.params);
    return qb;
  }

  /** Cuántas cajas pendientes de patente son mucho más chicas que la mayor de su misma imagen —
   * candidatas a "Descartar por tamaño relativo". */
  async previsualizarDescartarPorTamanoRelativo(
    filtros: FiltrosDescartarPorTamanoRelativo,
  ): Promise<PrevisualizacionDescartarPorTamanoRelativo> {
    const candidatos = await this.queryTamanoRelativoAnomalo(filtros).getCount();
    return { candidatos };
  }

  /** Marca 'falso_positivo' en bloque las cajas pendientes chicas frente a otra de la misma imagen
   * — solo toca `veredicto is null`, nunca pisa una ya adjudicada. */
  async descartarPorTamanoRelativo(
    filtros: FiltrosDescartarPorTamanoRelativo,
  ): Promise<ResultadoDescartarPorTamanoRelativo> {
    const { sql, params } = this.condicionTamanoRelativoAnomalo(filtros, "");
    const qb = this.repositorioDetecciones
      .createQueryBuilder()
      .update(DeteccionImagen)
      .set({ veredicto: "falso_positivo" })
      .where(sql, params)
      .andWhere("veredicto is null")
      .andWhere(condicionModeloMasReciente(""));

    const condicionImagen = this.condicionImagenEnRango("imagen_id", filtros);
    if (condicionImagen) qb.andWhere(condicionImagen.sql, condicionImagen.params);

    return { actualizadas: await this.ejecutarBulkVeredicto(qb) };
  }

  /** `prefijo` es el alias de la tabla en ese fragmento ("" para un UPDATE sin alias, "deteccion"
   * para un SELECT con alias) — mismo criterio que `condicionModeloMasReciente`. Las subconsultas
   * usan su propio alias y referencian la fila externa por el nombre real de la tabla cuando no
   * hay alias (`deteccion_imagen.imagen_id`), válido en Postgres dentro de un UPDATE.
   *
   * "Compite": hay OTRA detección de `clase` (modelo más reciente) en la misma imagen con área
   * ESTRICTAMENTE MAYOR — a propósito no es solo "count > 1": la caja más grande del grupo nunca
   * puede ser sospechosa de sí misma, así que no "compite". Sin este `id <>` de más, la caja
   * grande aparecía inflando "¿Cuáles se quedan?" (bug real encontrado en la práctica: 9
   * candidatas + 31 "se quedan" no sumaban las 39 imágenes que realmente compiten, porque la caja
   * grande de cada candidata quedaba contada también como "se queda" de sí misma). */
  private condicionCompite(filtros: FiltrosDescartarPorTamanoRelativo, prefijo: string): { sql: string; params: Record<string, unknown> } {
    const columna = (nombre: string) => (prefijo ? `${prefijo}.${nombre}` : nombre);
    const tablaExterna = prefijo || "deteccion_imagen";
    const sql = `
      ${columna("clase")} = :claseTamano
      and exists (
        select 1 from deteccion_imagen otras2
        where otras2.imagen_id = ${tablaExterna}.imagen_id
          and otras2.clase = :claseTamano
          and otras2.id <> ${columna("id")}
          and ${condicionModeloMasReciente("otras2")}
          and otras2.ancho * otras2.alto > ${columna("ancho")} * ${columna("alto")}
      )
    `;
    return { sql, params: { claseTamano: filtros.clase } };
  }

  /** Área/tamaño en píxeles por debajo del umbral — sin la condición de "compite" (ver
   * `condicionCompite`), para poder componer candidata = compite AND areaAnomala, y
   * "se queda" = compite AND NOT areaAnomala (ver `listarImagenesNoIncluidasPorTamanoRelativo`). */
  private condicionAreaAnomala(filtros: FiltrosDescartarPorTamanoRelativo, prefijo: string): { sql: string; params: Record<string, unknown> } {
    const columna = (nombre: string) => (prefijo ? `${prefijo}.${nombre}` : nombre);
    const tablaExterna = prefijo || "deteccion_imagen";
    let sql = `
      (${columna("ancho")} * ${columna("alto")}) < :relacionMaxima * (
        select max(otras.ancho * otras.alto)
        from deteccion_imagen otras
        where otras.imagen_id = ${tablaExterna}.imagen_id
          and otras.clase = :claseTamano
          and ${condicionModeloMasReciente("otras")}
      )
    `;
    const params: Record<string, unknown> = { claseTamano: filtros.clase, relacionMaxima: filtros.relacionMaxima };

    // ancho/alto en deteccion_imagen vienen normalizados (xywhn de YOLO, 0-1) — para comparar contra
    // un umbral en píxeles hay que escalarlos por la resolución real de la imagen (imagen_dataset).
    if (filtros.anchoMaximoPx != null || filtros.altoMaximoPx != null) {
      sql += `
        and exists (
          select 1 from imagen_dataset img_tam
          where img_tam.id = ${tablaExterna}.imagen_id
      `;
      if (filtros.anchoMaximoPx != null) {
        sql += ` and ${columna("ancho")} * img_tam.ancho <= :anchoMaximoPx`;
        params.anchoMaximoPx = filtros.anchoMaximoPx;
      }
      if (filtros.altoMaximoPx != null) {
        sql += ` and ${columna("alto")} * img_tam.alto <= :altoMaximoPx`;
        params.altoMaximoPx = filtros.altoMaximoPx;
      }
      sql += `)`;
    }

    return { sql, params };
  }

  /** Candidata a "Descartar por tamaño relativo" = compite con otra Y su área/tamaño está por
   * debajo del umbral. */
  private condicionTamanoRelativoAnomalo(
    filtros: FiltrosDescartarPorTamanoRelativo,
    prefijo: string,
  ): { sql: string; params: Record<string, unknown> } {
    const compite = this.condicionCompite(filtros, prefijo);
    const area = this.condicionAreaAnomala(filtros, prefijo);
    return {
      sql: `${compite.sql} and (${area.sql})`,
      params: { ...compite.params, ...area.params },
    };
  }

  /** "Se queda" = compite con otra detección de la misma imagen (por eso podría ser sospechosa)
   * pero NO llega a cumplir el umbral de tamaño actual — la zona gris que "Descartar por tamaño
   * relativo" deja sin tocar, para poder auditarla a mano en vez de que quede invisible. */
  private condicionCompiteSinSerCandidata(
    filtros: FiltrosDescartarPorTamanoRelativo,
    prefijo: string,
  ): { sql: string; params: Record<string, unknown> } {
    const compite = this.condicionCompite(filtros, prefijo);
    const area = this.condicionAreaAnomala(filtros, prefijo);
    return {
      sql: `${compite.sql} and not (${area.sql})`,
      params: { ...compite.params, ...area.params },
    };
  }

  private queryTamanoRelativoAnomalo(filtros: FiltrosDescartarPorTamanoRelativo): SelectQueryBuilder<DeteccionImagen> {
    const { sql, params } = this.condicionTamanoRelativoAnomalo(filtros, "deteccion");
    const qb = this.repositorioDetecciones
      .createQueryBuilder("deteccion")
      .where(sql, params)
      .andWhere("deteccion.veredicto is null")
      .andWhere(condicionModeloMasReciente("deteccion"));
    const condicionImagen = this.condicionImagenEnRango("deteccion.imagen_id", filtros);
    if (condicionImagen) qb.andWhere(condicionImagen.sql, condicionImagen.params);
    return qb;
  }

  private queryCompiteSinSerCandidata(filtros: FiltrosDescartarPorTamanoRelativo): SelectQueryBuilder<DeteccionImagen> {
    const { sql, params } = this.condicionCompiteSinSerCandidata(filtros, "deteccion");
    const qb = this.repositorioDetecciones
      .createQueryBuilder("deteccion")
      .where(sql, params)
      .andWhere("deteccion.veredicto is null")
      .andWhere(condicionModeloMasReciente("deteccion"));
    const condicionImagen = this.condicionImagenEnRango("deteccion.imagen_id", filtros);
    if (condicionImagen) qb.andWhere(condicionImagen.sql, condicionImagen.params);
    return qb;
  }

  /** Cuántas imágenes quedan en la "zona gris" (compiten pero no son candidatas) — para el label
   * del botón "¿Cuáles se quedan?" sin traer las imágenes completas. */
  async previsualizarNoIncluidasPorTamanoRelativo(
    filtros: FiltrosDescartarPorTamanoRelativo,
  ): Promise<PrevisualizacionDescartarPorTamanoRelativo> {
    const fila = await this.queryCompiteSinSerCandidata(filtros)
      .select("count(distinct deteccion.imagen_id)", "total")
      .getRawOne<{ total: string }>();
    return { candidatos: Number(fila?.total ?? 0) };
  }

  /** Imágenes con una caja de patente pendiente que "compite" con otra de la misma imagen (por
   * eso podría ser sospechosa) pero que "Descartar por tamaño relativo" deja sin tocar con el
   * umbral actual — para auditar la zona gris a mano en vez de que quede invisible (ver
   * `condicionCompiteSinSerCandidata`). */
  async listarImagenesNoIncluidasPorTamanoRelativo(
    filtros: FiltrosDescartarPorTamanoRelativo,
  ): Promise<ImagenDatasetResumida[]> {
    const idsCrudo = await this.queryCompiteSinSerCandidata(filtros)
      .select("distinct deteccion.imagen_id", "imagenId")
      .getRawMany<{ imagenId: string }>();
    const ids = idsCrudo.map((fila) => fila.imagenId);
    if (ids.length === 0) return [];

    const filas = await this.repositorioImagenes.find({ where: { id: In(ids) }, order: { rutaRelativa: "ASC" } });
    return this.mapearImagenes(filas);
  }

  /** Ancho/alto reales (en píxeles, no normalizados) de las cajas de `clase` ya confirmadas
   * 'correcta' — referencia para calibrar "Ancho máx. (px)" / "Alto máx. (px)" de "Descartar por
   * tamaño relativo" con datos reales en vez de a ojo. */
  async obtenerEstadisticasTamano(filtros: FiltrosEstadisticasTamanoPatente): Promise<EstadisticasTamanoPatente> {
    const qb = this.repositorioDetecciones
      .createQueryBuilder("deteccion")
      .innerJoin("imagen_dataset", "img", "img.id = deteccion.imagen_id")
      .where("deteccion.clase = :claseTamanoStats", { claseTamanoStats: filtros.clase })
      .andWhere("deteccion.veredicto = 'correcta'")
      .andWhere(condicionModeloMasReciente("deteccion"));
    if (filtros.planta) qb.andWhere("img.planta = :plantaTamanoStats", { plantaTamanoStats: filtros.planta });
    if (filtros.fechaDesde) {
      qb.andWhere("img.fecha >= :fechaDesdeTamanoStats", { fechaDesdeTamanoStats: filtros.fechaDesde });
    }
    if (filtros.fechaHasta) {
      qb.andWhere("img.fecha <= :fechaHastaTamanoStats", { fechaHastaTamanoStats: filtros.fechaHasta });
    }

    const fila = await qb
      .select("count(*)", "muestras")
      .addSelect("avg(deteccion.ancho * img.ancho)", "ancho_promedio")
      .addSelect("min(deteccion.ancho * img.ancho)", "ancho_min")
      .addSelect("max(deteccion.ancho * img.ancho)", "ancho_max")
      .addSelect("avg(deteccion.alto * img.alto)", "alto_promedio")
      .addSelect("min(deteccion.alto * img.alto)", "alto_min")
      .addSelect("max(deteccion.alto * img.alto)", "alto_max")
      .getRawOne<{
        muestras: string;
        ancho_promedio: string | null;
        ancho_min: string | null;
        ancho_max: string | null;
        alto_promedio: string | null;
        alto_min: string | null;
        alto_max: string | null;
      }>();

    const muestras = Number(fila?.muestras ?? 0);
    if (muestras === 0 || !fila) return { muestras: 0, ancho: null, alto: null };

    return {
      muestras,
      ancho: {
        promedio: Math.round(Number(fila.ancho_promedio)),
        min: Math.round(Number(fila.ancho_min)),
        max: Math.round(Number(fila.ancho_max)),
      },
      alto: {
        promedio: Math.round(Number(fila.alto_promedio)),
        min: Math.round(Number(fila.alto_min)),
        max: Math.round(Number(fila.alto_max)),
      },
    };
  }

  /** Cuántas cajas de patente quedarían aceptadas por "Aceptar todas" en esta vista/filtro —
   * mismo criterio que la galería (`construirQueryBase`), menos las imágenes `descartada`. */
  async previsualizarAceptarTodas(filtros: FiltrosAceptarTodas): Promise<PrevisualizacionAceptarTodas> {
    const idsQuery = this.queryImagenesElegiblesParaAceptarTodas(filtros);
    const candidatos = await this.repositorioDetecciones
      .createQueryBuilder("deteccion")
      .where("deteccion.clase = :clasePatenteAceptarTodas", { clasePatenteAceptarTodas: CLASE_PATENTE })
      .andWhere("deteccion.veredicto is null")
      .andWhere(condicionModeloMasReciente("deteccion"))
      .andWhere(`deteccion.imagen_id in (${idsQuery.getQuery()})`)
      .setParameters(idsQuery.getParameters())
      .getCount();
    return { candidatos };
  }

  /** Equivalente a hacer click en cada caja de patente pendiente y marcarla 'correcta', para
   * todas las imágenes de la vista/filtro actual — excepto las `descartada`. Solo toca
   * `veredicto is null`, nunca pisa una ya adjudicada (igual que `aceptarPorConfianza`). */
  async aceptarTodas(filtros: FiltrosAceptarTodas): Promise<ResultadoAceptarTodas> {
    const idsQuery = this.queryImagenesElegiblesParaAceptarTodas(filtros);
    const qb = this.repositorioDetecciones
      .createQueryBuilder()
      .update(DeteccionImagen)
      .set({ veredicto: "correcta" })
      .where("clase = :clasePatenteAceptarTodas", { clasePatenteAceptarTodas: CLASE_PATENTE })
      .andWhere("veredicto is null")
      .andWhere(condicionModeloMasReciente(""))
      .andWhere(`imagen_id in (${idsQuery.getQuery()})`)
      .setParameters(idsQuery.getParameters());

    return { actualizadas: await this.ejecutarBulkVeredicto(qb) };
  }

  /** Mismos filtros que `listarImagenes` (vista/planta/fecha/etiqueta), sumando la exclusión de
   * imágenes `descartada` — esas nunca deben quedar con cajas aceptadas en bloque. */
  private queryImagenesElegiblesParaAceptarTodas(filtros: FiltrosAceptarTodas): SelectQueryBuilder<ImagenDataset> {
    const qb = this.construirQueryBase({
      vista: filtros.vista ?? "todas",
      planta: filtros.planta,
      fechaDesde: filtros.fechaDesde,
      fechaHasta: filtros.fechaHasta,
      etiqueta: filtros.etiqueta,
    });
    qb.andWhere(
      `not exists (select 1 from etiqueta_imagen edat where edat.imagen_id = imagen.id and edat.tipo_clave = :claveDescartadaAceptarTodas)`,
      { claveDescartadaAceptarTodas: CLAVE_DESCARTADA },
    );
    return qb.select("imagen.id", "id");
  }

  async previsualizarDescartarPendientes(
    filtros: FiltrosDescartarPendientes,
  ): Promise<PrevisualizacionDescartarPendientes> {
    return { candidatos: await this.construirQueryBase({ ...filtros, vista: "pendiente" }).getCount() };
  }

  /** INSERT ... SELECT en vez de traer los ids a Node: sin filtros la vista "pendiente" puede tener
   * >150k imágenes. La nota fija permite deshacer el lote a mano (`delete ... where nota = ...`),
   * porque `origen` sigue siendo 'manual' igual que el botón "Descartar" de cada imagen. */
  async descartarPendientes(filtros: FiltrosDescartarPendientes): Promise<ResultadoDescartarPendientes> {
    const [sqlPendientes, parametros] = this.construirQueryBase({ ...filtros, vista: "pendiente" })
      .select("imagen.id", "id")
      .getQueryAndParameters();
    const n = parametros.length;
    const filas: unknown[] = await this.repositorioEtiquetas.query(
      `insert into etiqueta_imagen (imagen_id, tipo_clave, origen, nota)
       select pendientes.id, $${n + 1}, 'manual', $${n + 2} from (${sqlPendientes}) pendientes
       on conflict (imagen_id, tipo_clave) do nothing
       returning imagen_id`,
      [...parametros, CLAVE_DESCARTADA, NOTA_DESCARTE_EN_BLOQUE],
    );
    return { descartadas: filas.length };
  }

  private condicionRangoConfianza(filtros: FiltrosAceptarPorConfianza): { sql: string; params: Record<string, unknown> } {
    const params: Record<string, unknown> = { clase: filtros.clase, confianzaMin: filtros.confianzaMin };
    let sql = "clase = :clase and confianza >= :confianzaMin";
    if (filtros.confianzaMax != null) {
      sql += " and confianza <= :confianzaMax";
      params.confianzaMax = filtros.confianzaMax;
    }
    return { sql, params };
  }

  /** `columnaImagenId` es el nombre real de columna a usar en el fragmento crudo (`imagen_id`
   * a secas para un UPDATE sin alias, `deteccion.imagen_id` para un SELECT con alias). */
  private condicionImagenEnRango(
    columnaImagenId: string,
    filtros: Pick<FiltrosAceptarPorConfianza, "planta" | "fechaDesde" | "fechaHasta">,
  ): { sql: string; params: Record<string, unknown> } | null {
    const condiciones: string[] = [];
    const params: Record<string, unknown> = {};
    if (filtros.planta) {
      condiciones.push("i.planta = :imgPlanta");
      params.imgPlanta = filtros.planta;
    }
    if (filtros.fechaDesde) {
      condiciones.push("i.fecha >= :imgFechaDesde");
      params.imgFechaDesde = filtros.fechaDesde;
    }
    if (filtros.fechaHasta) {
      condiciones.push("i.fecha <= :imgFechaHasta");
      params.imgFechaHasta = filtros.fechaHasta;
    }
    if (condiciones.length === 0) return null;
    return {
      sql: `${columnaImagenId} in (select i.id from imagen_dataset i where ${condiciones.join(" and ")})`,
      params,
    };
  }

  private queryRangoConfianza(filtros: FiltrosAceptarPorConfianza): SelectQueryBuilder<DeteccionImagen> {
    const { sql, params } = this.condicionRangoConfianza(filtros);
    const qb = this.repositorioDetecciones
      .createQueryBuilder("deteccion")
      .where(sql, params)
      .andWhere(condicionModeloMasReciente("deteccion"));
    const condicionImagen = this.condicionImagenEnRango("deteccion.imagen_id", filtros);
    if (condicionImagen) qb.andWhere(condicionImagen.sql, condicionImagen.params);
    return qb;
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
    if (filtros.confianzaMin != null || filtros.confianzaMax != null) {
      const condiciones = ["dc.imagen_id = imagen.id", "dc.veredicto is null", condicionModeloMasReciente("dc")];
      const params: Record<string, number | string> = {};
      if (filtros.confianzaClase) {
        condiciones.push("dc.clase = :confianzaClase");
        params.confianzaClase = filtros.confianzaClase;
      }
      if (filtros.confianzaMin != null) {
        condiciones.push("dc.confianza >= :confianzaMin");
        params.confianzaMin = filtros.confianzaMin;
      }
      if (filtros.confianzaMax != null) {
        condiciones.push("dc.confianza <= :confianzaMax");
        params.confianzaMax = filtros.confianzaMax;
      }
      qb.andWhere(`exists (select 1 from deteccion_imagen dc where ${condiciones.join(" and ")})`, params);
    }

    this.aplicarFiltroVista(qb, filtros.vista);
    return qb;
  }

  private aplicarFiltroVista(qb: SelectQueryBuilder<ImagenDataset>, vista: VistaDataset): void {
    if (vista === "todas") return;

    if (vista === "vehiculo_con_patente") {
      qb.andWhere(EXISTE_VEHICULO, { clasesVehiculo: CLASES_VEHICULO }).andWhere(EXISTE_PATENTE, {
        clasePatente: CLASE_PATENTE,
      });
      return;
    }
    if (vista === "solo_patente") {
      qb.andWhere(`not ${EXISTE_VEHICULO}`, { clasesVehiculo: CLASES_VEHICULO }).andWhere(EXISTE_PATENTE, {
        clasePatente: CLASE_PATENTE,
      });
      return;
    }
    if (vista === "vehiculo_sin_patente") {
      qb.andWhere(EXISTE_VEHICULO, { clasesVehiculo: CLASES_VEHICULO }).andWhere(`not ${EXISTE_PATENTE}`, {
        clasePatente: CLASE_PATENTE,
      });
      return;
    }
    if (vista === "pendiente") {
      qb.andWhere(`not ${EXISTE_REVISADA}`, { claveRevisadaVista: CLAVE_REVISADA }).andWhere(
        `not ${EXISTE_DESCARTADA}`,
        { claveDescartadaVista: CLAVE_DESCARTADA },
      );
      return;
    }
    if (vista === "aceptada") {
      qb.andWhere(LISTA_PARA_ENTRENAR, { claveRevisada: CLAVE_REVISADA, claveDescartada: CLAVE_DESCARTADA });
      return;
    }
    if (vista === "descartada") {
      qb.andWhere(EXISTE_DESCARTADA, { claveDescartadaVista: CLAVE_DESCARTADA });
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
   * el mismo modelo. Las imágenes cuyas detecciones de ese modelo ya tienen veredicto humano se
   * dejan INTACTAS (no se borran ni se reemplazan) en vez de abortar todo el lote — así reprocesar
   * una planta/rango no hace perder revisión ya hecha, solo la salta y trae detecciones nuevas
   * para el resto.
   */
  async cargarDetecciones(
    filas: FilaDeteccionCsv[],
    modelo: string,
    opciones: { reemplazar: boolean },
  ): Promise<ResultadoCargaDetecciones> {
    if (filas.length === 0) return { cargadas: 0, sinImagen: 0, protegidas: 0 };

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

    let protegidas = 0;
    let filasInsertadas = filasConImagen;
    await this.repositorioImagenes.manager.transaction(async (manager) => {
      let idsAReemplazar = idsImagenes;
      if (opciones.reemplazar && idsImagenes.length > 0) {
        const conVeredicto = await manager.find(DeteccionImagen, {
          select: { imagenId: true },
          where: { modelo, imagenId: In(idsImagenes), veredicto: Not(IsNull()) },
        });
        const idsProtegidos = new Set(conVeredicto.map((deteccion) => deteccion.imagenId));
        protegidas = idsProtegidos.size;
        if (protegidas > 0) {
          idsAReemplazar = idsImagenes.filter((id) => !idsProtegidos.has(id));
          filasInsertadas = filasConImagen.filter((f) => !idsProtegidos.has(f.imagenId));
        }
        if (idsAReemplazar.length > 0) {
          await manager.delete(DeteccionImagen, { modelo, imagenId: In(idsAReemplazar) });
        }
      }

      for (let i = 0; i < filasInsertadas.length; i += TAMANO_LOTE_CARGA) {
        const lote = filasInsertadas.slice(i, i + TAMANO_LOTE_CARGA).map(({ imagenId, fila }) =>
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

    return { cargadas: filasInsertadas.length, sinImagen, protegidas };
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

/** Cuando dos modelos corren sobre la misma imagen (p.ej. el modelo base y el fine-tune propio),
 * cada uno deja su propia fila en `deteccion_imagen` — casi superpuestas si detectan la misma
 * patente física, lo que en la galería se ve como cajas fantasma tapándose entre sí. Por cada
 * (imagen, clase) se conserva solo el modelo que insertó la fila MÁS RECIENTE en ese grupo (todas
 * sus cajas, no una sola — así no se pierde un caso legítimo de "N° patentes" en la misma
 * imagen). Es por imagen, no un modelo fijo global: una imagen que solo fue procesada por el
 * modelo viejo (nunca reprocesada) sigue mostrando esa caja igual, no desaparece. */
function soloModeloMasRecientePorGrupo(cajas: DeteccionImagen[]): DeteccionImagen[] {
  const modeloGanadorPorGrupo = new Map<string, { modelo: string; creadoEn: Date }>();
  for (const caja of cajas) {
    const clave = `${caja.imagenId}|${caja.clase}`;
    const actual = modeloGanadorPorGrupo.get(clave);
    if (!actual || caja.creadoEn > actual.creadoEn) {
      modeloGanadorPorGrupo.set(clave, { modelo: caja.modelo, creadoEn: caja.creadoEn });
    }
  }
  return cajas.filter((caja) => modeloGanadorPorGrupo.get(`${caja.imagenId}|${caja.clase}`)?.modelo === caja.modelo);
}

/** Equivalente SQL de `soloModeloMasRecientePorGrupo`, para los bulk-write de aceptar-por-confianza
 * y aceptar-todas: una fila solo califica si su modelo es el que insertó más reciente para su
 * propio (imagen_id, clase). `prefijo` es el alias de la tabla en ese fragmento ("" para un UPDATE
 * sin alias, "deteccion" para un SELECT con alias). */
function condicionModeloMasReciente(prefijo: string): string {
  const columna = (nombre: string) => (prefijo ? `${prefijo}.${nombre}` : nombre);
  return `${columna("modelo")} = (
    select d2.modelo from deteccion_imagen d2
    where d2.imagen_id = ${columna("imagen_id")} and d2.clase = ${columna("clase")}
    order by d2.creado_en desc
    limit 1
  )`;
}
