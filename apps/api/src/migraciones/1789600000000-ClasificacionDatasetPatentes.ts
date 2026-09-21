import type { MigrationInterface, QueryRunner } from "typeorm";

export class ClasificacionDatasetPatentes1789600000000 implements MigrationInterface {
  name = "ClasificacionDatasetPatentes1789600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      create table "clasificacion_imagen_dataset" (
        "id" uuid primary key default gen_random_uuid(),
        "nombre_archivo" varchar not null,
        "origen" varchar not null,
        "perspectiva" varchar not null,
        "motivo" varchar null,
        "creado_en" timestamptz not null default now(),
        constraint "CHK_clasificacion_origen" check ("origen" in ('dataset', 'sin_vehiculo', 'sin_deteccion')),
        constraint "CHK_clasificacion_perspectiva" check ("perspectiva" in ('patente_sin_vehiculo', 'descartada_sin_vehiculo', 'caso_dificil')),
        constraint "CHK_clasificacion_motivo" check ("motivo" is null or "motivo" in ('brillo', 'suciedad', 'otro')),
        constraint "UQ_clasificacion_archivo_origen" unique ("nombre_archivo", "origen")
      )
    `);

    await queryRunner.query(`
      create index "IDX_clasificacion_perspectiva"
      on "clasificacion_imagen_dataset" ("perspectiva")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop index if exists "IDX_clasificacion_perspectiva"`);
    await queryRunner.query(`drop table if exists "clasificacion_imagen_dataset"`);
  }
}
