import type { MigrationInterface, QueryRunner } from "typeorm";

const CATALOGO_INICIAL: { clave: string; nombre: string; familia: string; orden: number }[] = [
  { clave: "vehiculo_detectado", nombre: "Vehículo detectado", familia: "deteccion", orden: 1 },
  { clave: "patente_detectada", nombre: "Patente detectada", familia: "deteccion", orden: 2 },
  { clave: "sin_vehiculo_con_patente", nombre: "Sin vehículo, con patente", familia: "deteccion", orden: 3 },
  { clave: "sin_deteccion", nombre: "Sin detección", familia: "deteccion", orden: 4 },
  { clave: "brillo", nombre: "Brillo", familia: "calidad", orden: 10 },
  { clave: "suciedad", nombre: "Suciedad", familia: "calidad", orden: 11 },
  { clave: "distancia", nombre: "Distancia", familia: "calidad", orden: 12 },
  { clave: "descartada", nombre: "Descartada", familia: "revision", orden: 20 },
  { clave: "revisada", nombre: "Revisada", familia: "revision", orden: 21 },
];

export class InventarioDataset1789800000000 implements MigrationInterface {
  name = "InventarioDataset1789800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop table if exists "procedencia_imagen"`);

    await queryRunner.query(`
      create table "imagen_dataset" (
        "id" uuid primary key default gen_random_uuid(),
        "ruta_relativa" varchar not null,
        "nombre_archivo" varchar not null,
        "planta" varchar null,
        "fecha" date null,
        "ancho" int not null,
        "alto" int not null,
        "tamano_bytes" bigint not null,
        "indexado_en" timestamptz not null default now(),
        "visto_en" timestamptz not null default now(),
        constraint "UQ_imagen_dataset_ruta_relativa" unique ("ruta_relativa")
      )
    `);
    await queryRunner.query(`
      create index "IDX_imagen_dataset_nombre_archivo" on "imagen_dataset" ("nombre_archivo")
    `);
    await queryRunner.query(`
      create index "IDX_imagen_dataset_planta_fecha" on "imagen_dataset" ("planta", "fecha")
    `);

    await queryRunner.query(`
      create table "tipo_etiqueta" (
        "clave" varchar primary key,
        "nombre" varchar not null,
        "familia" varchar not null,
        "orden" int not null default 0,
        "activa" boolean not null default true,
        constraint "CHK_tipo_etiqueta_familia" check ("familia" in ('deteccion', 'calidad', 'revision'))
      )
    `);

    await queryRunner.query(`
      create table "etiqueta_imagen" (
        "id" uuid primary key default gen_random_uuid(),
        "imagen_id" uuid not null references "imagen_dataset"("id") on delete cascade,
        "tipo_clave" varchar not null references "tipo_etiqueta"("clave"),
        "origen" varchar not null,
        "nota" varchar null,
        "creado_en" timestamptz not null default now(),
        constraint "UQ_etiqueta_imagen_imagen_tipo" unique ("imagen_id", "tipo_clave"),
        constraint "CHK_etiqueta_imagen_origen" check ("origen" in ('manual', 'modelo', 'migracion'))
      )
    `);
    await queryRunner.query(`
      create index "IDX_etiqueta_imagen_tipo_clave" on "etiqueta_imagen" ("tipo_clave")
    `);

    await queryRunner.query(`
      create table "deteccion_imagen" (
        "id" uuid primary key default gen_random_uuid(),
        "imagen_id" uuid not null references "imagen_dataset"("id") on delete cascade,
        "modelo" varchar not null,
        "clase" varchar not null,
        "confianza" real not null,
        "xc" real not null,
        "yc" real not null,
        "ancho" real not null,
        "alto" real not null,
        "veredicto" varchar null,
        "creado_en" timestamptz not null default now(),
        constraint "CHK_deteccion_imagen_veredicto" check ("veredicto" is null or "veredicto" in ('correcta', 'falso_positivo'))
      )
    `);
    await queryRunner.query(`
      create index "IDX_deteccion_imagen_imagen" on "deteccion_imagen" ("imagen_id")
    `);
    await queryRunner.query(`
      create index "IDX_deteccion_imagen_clase_imagen" on "deteccion_imagen" ("clase", "imagen_id")
    `);
    await queryRunner.query(`
      create index "IDX_deteccion_imagen_modelo" on "deteccion_imagen" ("modelo")
    `);

    for (const tipo of CATALOGO_INICIAL) {
      await queryRunner.query(
        `insert into "tipo_etiqueta" ("clave", "nombre", "familia", "orden") values ($1, $2, $3, $4)`,
        [tipo.clave, tipo.nombre, tipo.familia, tipo.orden],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop table if exists "deteccion_imagen"`);
    await queryRunner.query(`drop table if exists "etiqueta_imagen"`);
    await queryRunner.query(`drop table if exists "tipo_etiqueta"`);
    await queryRunner.query(`drop table if exists "imagen_dataset"`);

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
      create index "IDX_procedencia_planta_fecha" on "procedencia_imagen" ("planta", "fecha")
    `);
  }
}
