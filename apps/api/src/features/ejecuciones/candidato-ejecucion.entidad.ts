import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { Ejecucion } from "./ejecucion.entidad.js";

@Entity({ name: "candidato_ejecucion" })
@Index(["ejecucion"])
@Unique(["ejecucion", "orden"])
export class CandidatoEjecucion {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Ejecucion, (ejecucion) => ejecucion.candidatos, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ejecucion_id" })
  ejecucion!: Ejecucion;

  @Column({ type: "int" })
  orden!: number;

  @Column({ type: "int" })
  x!: number;

  @Column({ type: "int" })
  y!: number;

  @Column({ type: "int" })
  ancho!: number;

  @Column({ type: "int" })
  alto!: number;

  @Column({ type: "real" })
  angulo!: number;

  @Column({ type: "real" })
  area!: number;

  @Column({ type: "varchar", nullable: true })
  texto!: string | null;

  @Column({ type: "real", nullable: true })
  confianza!: number | null;

  @Column({ type: "real" })
  coincidencia!: number;

  @Column({ name: "imagen_png", type: "bytea", select: false })
  imagenPng!: Buffer;
}
