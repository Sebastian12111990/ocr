import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { ImagenDataset } from "./imagen-dataset.entidad.js";

export type VeredictoDeteccion = "correcta" | "falso_positivo";

/**
 * Salida de un modelo sobre una imagen — capa barata y desechable (ver
 * docs/decisiones-modelo-dataset.md): se re-corre el modelo, no se migra a mano.
 * `modelo` versiona la fila: dos corridas de modelos distintos conviven y se comparan.
 */
@Entity({ name: "deteccion_imagen" })
@Index(["imagen"])
@Index(["clase", "imagen"])
@Index(["modelo"])
export class DeteccionImagen {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "imagen_id", type: "uuid" })
  imagenId!: string;

  @ManyToOne(() => ImagenDataset, { onDelete: "CASCADE" })
  @JoinColumn({ name: "imagen_id" })
  imagen!: ImagenDataset;

  @Column({ type: "varchar" })
  modelo!: string;

  @Column({ type: "varchar" })
  clase!: string;

  @Column({ type: "real" })
  confianza!: number;

  @Column({ type: "real" })
  xc!: number;

  @Column({ type: "real" })
  yc!: number;

  @Column({ type: "real" })
  ancho!: number;

  @Column({ type: "real" })
  alto!: number;

  @Column({ type: "varchar", nullable: true })
  veredicto!: VeredictoDeteccion | null;

  @CreateDateColumn({ name: "creado_en" })
  creadoEn!: Date;
}
