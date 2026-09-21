import type { MigrationInterface, QueryRunner } from "typeorm";

export class VisualizadorEntrenamientoYolo1789500000000 implements MigrationInterface {
  name = "VisualizadorEntrenamientoYolo1789500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      create table "entrenamiento_yolo" (
        "id" uuid primary key default gen_random_uuid(),
        "nombre" varchar not null,
        "tipo" varchar not null,
        "modelo_base" varchar not null,
        "parametros" jsonb not null default '{}',
        "metricas_finales" jsonb null,
        "total_imagenes" int not null,
        "imagenes_con_deteccion" int null,
        "ruta_pesos" varchar null,
        "duracion_ms" int not null,
        "creado_en" timestamptz not null default now(),
        constraint "CHK_entrenamiento_yolo_tipo" check ("tipo" in ('sondeo', 'auto_etiquetado', 'entrenamiento'))
      )
    `);

    await queryRunner.query(`
      create table "metrica_epoca" (
        "id" uuid primary key default gen_random_uuid(),
        "entrenamiento_id" uuid not null references "entrenamiento_yolo"("id") on delete cascade,
        "epoca" int not null,
        "box_loss" real not null,
        "cls_loss" real not null,
        "dfl_loss" real not null,
        "map50" real null,
        "map50_95" real null,
        "precision" real null,
        "recall" real null,
        constraint "UQ_metrica_epoca_entrenamiento_epoca" unique ("entrenamiento_id", "epoca")
      )
    `);

    await queryRunner.query(`
      create index "IDX_metrica_epoca_entrenamiento"
      on "metrica_epoca" ("entrenamiento_id")
    `);
    await queryRunner.query(`
      create index "IDX_entrenamiento_yolo_creado"
      on "entrenamiento_yolo" ("creado_en" desc)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop index if exists "IDX_entrenamiento_yolo_creado"`);
    await queryRunner.query(`drop index if exists "IDX_metrica_epoca_entrenamiento"`);
    await queryRunner.query(`drop table if exists "metrica_epoca"`);
    await queryRunner.query(`drop table if exists "entrenamiento_yolo"`);
  }
}
