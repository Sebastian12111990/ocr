import type { MigrationInterface, QueryRunner } from "typeorm";

export class Inicial1735000000000 implements MigrationInterface {
  name = "Inicial1735000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create extension if not exists "pgcrypto"`);

    await queryRunner.query(`
      create table "imagen" (
        "id" uuid primary key default gen_random_uuid(),
        "nombre_archivo" varchar not null unique,
        "ruta_relativa" varchar not null,
        "ancho" int not null,
        "alto" int not null,
        "patente_esperada" varchar null,
        "creado_en" timestamptz not null default now()
      )
    `);

    await queryRunner.query(`
      create table "preset" (
        "id" uuid primary key default gen_random_uuid(),
        "nombre" varchar not null unique,
        "modo" varchar not null,
        "etapas" jsonb not null,
        "creado_en" timestamptz not null default now(),
        "actualizado_en" timestamptz not null default now()
      )
    `);

    await queryRunner.query(`
      create table "ejecucion" (
        "id" uuid primary key default gen_random_uuid(),
        "imagen_id" uuid not null references "imagen"("id") on delete cascade,
        "preset_id" uuid null references "preset"("id") on delete set null,
        "modo" varchar not null,
        "etapas" jsonb not null,
        "texto_detectado" varchar null,
        "confianza" real null,
        "acierto" boolean not null default false,
        "distancia_edicion" int null,
        "duracion_ms" int not null,
        "creado_en" timestamptz not null default now()
      )
    `);

    await queryRunner.query(`
      create index "IDX_ejecucion_imagen_acierto" on "ejecucion" ("imagen_id", "acierto")
    `);
    await queryRunner.query(`
      create index "IDX_ejecucion_etapas_gin" on "ejecucion" using gin ("etapas" jsonb_path_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop table if exists "ejecucion"`);
    await queryRunner.query(`drop table if exists "preset"`);
    await queryRunner.query(`drop table if exists "imagen"`);
  }
}
