import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";

import { EntrenamientoYolo } from "./entrenamiento-yolo.entidad.js";

@Entity({ name: "metrica_epoca" })
@Index(["entrenamiento"])
@Unique(["entrenamiento", "epoca"])
export class MetricaEpoca {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => EntrenamientoYolo, (entrenamiento) => entrenamiento.metricasPorEpoca, { onDelete: "CASCADE" })
  @JoinColumn({ name: "entrenamiento_id" })
  entrenamiento!: EntrenamientoYolo;

  @Column({ type: "int" })
  epoca!: number;

  @Column({ name: "box_loss", type: "real" })
  boxLoss!: number;

  @Column({ name: "cls_loss", type: "real" })
  clsLoss!: number;

  @Column({ name: "dfl_loss", type: "real" })
  dflLoss!: number;

  @Column({ type: "real", nullable: true })
  map50!: number | null;

  @Column({ name: "map50_95", type: "real", nullable: true })
  map5095!: number | null;

  @Column({ type: "real", nullable: true })
  precision!: number | null;

  @Column({ type: "real", nullable: true })
  recall!: number | null;
}
