import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

import type { EtapaPipeline } from "../../shared/contrato/pipeline.js";

@Entity({ name: "preset" })
export class Preset {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  nombre!: string;

  @Column({ type: "varchar" })
  modo!: "fijo" | "libre";

  @Column({ type: "jsonb" })
  etapas!: EtapaPipeline[];

  @CreateDateColumn({ name: "creado_en" })
  creadoEn!: Date;

  @UpdateDateColumn({ name: "actualizado_en" })
  actualizadoEn!: Date;
}
