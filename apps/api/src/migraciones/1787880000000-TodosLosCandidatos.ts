import type { MigrationInterface, QueryRunner } from "typeorm";

export class TodosLosCandidatos1787880000000 implements MigrationInterface {
  name = "TodosLosCandidatos1787880000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      alter table "candidato_ejecucion"
        drop constraint "CHK_candidato_ejecucion_coincidencia",
        alter column "texto" drop not null,
        add constraint "CHK_candidato_ejecucion_coincidencia"
          check ("coincidencia" >= 0 and "coincidencia" <= 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      delete from "candidato_ejecucion"
      where "coincidencia" < 20
    `);
    await queryRunner.query(`
      update "candidato_ejecucion"
      set "texto" = ''
      where "texto" is null
    `);
    await queryRunner.query(`
      alter table "candidato_ejecucion"
        drop constraint "CHK_candidato_ejecucion_coincidencia",
        alter column "texto" set not null,
        add constraint "CHK_candidato_ejecucion_coincidencia"
          check ("coincidencia" >= 20 and "coincidencia" <= 100)
    `);
  }
}
