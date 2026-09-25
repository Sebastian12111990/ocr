import type { MigrationInterface, QueryRunner } from "typeorm";

/** "Ángulo" sola no decía hacia dónde estaba torcido el encuadre — se reemplaza por 4 etiquetas
 * combinables (una imagen puede tener, por ejemplo, "Ángulo izquierda" + "Ángulo arriba" a la
 * vez, para una esquina). Se suman etiquetas de defecto que todavía no existen (Patente cortada,
 * N° patentes, Falso positivo, Vehículo doble patente) — "Brillo" y "Suciedad" ya estaban en el
 * catálogo desde el seed original, no se tocan. Van al modal de detalle de la imagen
 * (GaleriaImagenes ya no las muestra en la tarjeta). Se desactiva en vez de borrar "angulo" —
 * mismo motivo que la migración anterior (EtiquetasDistanciaAnguloRevision): el catálogo es
 * editable por `activa`, no un CHECK constraint, y ya puede haber imágenes etiquetadas con la
 * clave vieja. */
const NUEVAS: { clave: string; nombre: string; familia: string; orden: number }[] = [
  { clave: "angulo_izquierda", nombre: "Ángulo izquierda", familia: "calidad", orden: 14 },
  { clave: "angulo_derecha", nombre: "Ángulo derecha", familia: "calidad", orden: 15 },
  { clave: "angulo_arriba", nombre: "Ángulo arriba", familia: "calidad", orden: 16 },
  { clave: "angulo_abajo", nombre: "Ángulo abajo", familia: "calidad", orden: 17 },
  { clave: "patente_cortada", nombre: "Patente cortada", familia: "calidad", orden: 18 },
  { clave: "n_patentes", nombre: "N° patentes", familia: "calidad", orden: 19 },
  { clave: "falso_positivo_imagen", nombre: "Falso positivo", familia: "calidad", orden: 20 },
  { clave: "vehiculo_doble_patente", nombre: "Vehículo doble patente", familia: "calidad", orden: 21 },
];

export class EtiquetasCalidadDetalladas1790268246138 implements MigrationInterface {
  name = "EtiquetasCalidadDetalladas1790268246138";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update "tipo_etiqueta" set "activa" = false where "clave" = 'angulo'`);

    for (const tipo of NUEVAS) {
      await queryRunner.query(
        `insert into "tipo_etiqueta" ("clave", "nombre", "familia", "orden") values ($1, $2, $3, $4)`,
        [tipo.clave, tipo.nombre, tipo.familia, tipo.orden],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `delete from "tipo_etiqueta" where "clave" in (${NUEVAS.map((_, i) => `$${i + 1}`).join(", ")})`,
      NUEVAS.map((tipo) => tipo.clave),
    );
    await queryRunner.query(`update "tipo_etiqueta" set "activa" = true where "clave" = 'angulo'`);
  }
}
