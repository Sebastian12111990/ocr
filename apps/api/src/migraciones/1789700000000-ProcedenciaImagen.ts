import type { MigrationInterface, QueryRunner } from "typeorm";

export class ProcedenciaImagen1789700000000 implements MigrationInterface {
  name = "ProcedenciaImagen1789700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      create table "procedencia_imagen" (
        "id" uuid primary key default gen_random_uuid(),
        "nombre_archivo" varchar not null,
        "planta" varchar not null,
        "fecha" date not null,
        "creado_en" timestamptz not null default now(),
        constraint "UQ_procedencia_nombre_archivo" unique ("nombre_archivo")
      )
    `);

    await queryRunner.query(`
      create index "IDX_procedencia_planta_fecha"
      on "procedencia_imagen" ("planta", "fecha")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop index if exists "IDX_procedencia_planta_fecha"`);
    await queryRunner.query(`drop table if exists "procedencia_imagen"`);
  }
}
