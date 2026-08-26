import type { MigrationInterface, QueryRunner } from "typeorm";

export class PersistenciaExperimentos1787740000000 implements MigrationInterface {
  name = "PersistenciaExperimentos1787740000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      alter table "ejecucion"
        add column "pipeline_version" int not null default 1,
        add column "patente_esperada" varchar null,
        add column "mejor_coincidencia" real null,
        add column "imagen_procesada_png" bytea null
    `);

    await queryRunner.query(`
      update "ejecucion" as e
      set "patente_esperada" = i."patente_esperada"
      from "imagen" as i
      where i."id" = e."imagen_id"
    `);

    await queryRunner.query(`
      create table "candidato_ejecucion" (
        "id" uuid primary key default gen_random_uuid(),
        "ejecucion_id" uuid not null references "ejecucion"("id") on delete cascade,
        "orden" int not null,
        "x" int not null,
        "y" int not null,
        "ancho" int not null,
        "alto" int not null,
        "angulo" real not null,
        "area" real not null,
        "texto" varchar not null,
        "confianza" real null,
        "coincidencia" real not null,
        "imagen_png" bytea not null,
        constraint "UQ_candidato_ejecucion_orden" unique ("ejecucion_id", "orden"),
        constraint "CHK_candidato_ejecucion_coincidencia" check ("coincidencia" >= 20 and "coincidencia" <= 100)
      )
    `);

    await queryRunner.query(`
      create index "IDX_candidato_ejecucion_ejecucion"
      on "candidato_ejecucion" ("ejecucion_id")
    `);
    await queryRunner.query(`
      create index "IDX_ejecucion_imagen_creado"
      on "ejecucion" ("imagen_id", "creado_en" desc)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop index if exists "IDX_ejecucion_imagen_creado"`);
    await queryRunner.query(`drop table if exists "candidato_ejecucion"`);
    await queryRunner.query(`
      alter table "ejecucion"
        drop column if exists "imagen_procesada_png",
        drop column if exists "mejor_coincidencia",
        drop column if exists "patente_esperada",
        drop column if exists "pipeline_version"
    `);
  }
}
