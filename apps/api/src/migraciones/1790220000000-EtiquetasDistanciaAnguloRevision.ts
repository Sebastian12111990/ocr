import type { MigrationInterface, QueryRunner } from "typeorm";

/** "Distancia" sola no distinguía muy cerca de muy lejos — se reemplaza por dos etiquetas
 * específicas, y se suma "Ángulo" para encuadres de cámara torcidos. Se desactiva en vez de
 * borrar: ya hay imágenes etiquetadas con "distancia" (tipo_etiqueta no tiene ON DELETE CASCADE
 * desde etiqueta_imagen), y el catálogo es editable por diseño (ver ServicioDataset.listarTiposEtiqueta,
 * que filtra por `activa`) — no un CHECK constraint que obligue a elegir entre borrar o nada. */
const NUEVAS: { clave: string; nombre: string; familia: string; orden: number }[] = [
  { clave: "cerca", nombre: "Muy cerca", familia: "calidad", orden: 12 },
  { clave: "lejos", nombre: "Muy lejos", familia: "calidad", orden: 13 },
  { clave: "angulo", nombre: "Ángulo", familia: "calidad", orden: 14 },
];

export class EtiquetasDistanciaAnguloRevision1790220000000 implements MigrationInterface {
  name = "EtiquetasDistanciaAnguloRevision1790220000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update "tipo_etiqueta" set "activa" = false where "clave" = 'distancia'`);

    for (const tipo of NUEVAS) {
      await queryRunner.query(
        `insert into "tipo_etiqueta" ("clave", "nombre", "familia", "orden") values ($1, $2, $3, $4)`,
        [tipo.clave, tipo.nombre, tipo.familia, tipo.orden],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`delete from "tipo_etiqueta" where "clave" in ('cerca', 'lejos', 'angulo')`);
    await queryRunner.query(`update "tipo_etiqueta" set "activa" = true where "clave" = 'distancia'`);
  }
}
