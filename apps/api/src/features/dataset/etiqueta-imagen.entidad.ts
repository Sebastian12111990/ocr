import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";

import { ImagenDataset } from "./imagen-dataset.entidad.js";
import { TipoEtiqueta } from "./tipo-etiqueta.entidad.js";

export type OrigenEtiqueta = "manual" | "modelo" | "migracion";

/** Relación N:M imagen↔tipo de etiqueta — una imagen puede tener brillo *y* ser caso difícil a la vez. */
@Entity({ name: "etiqueta_imagen" })
@Unique(["imagen", "tipoClave"])
@Index(["tipoClave"])
export class EtiquetaImagen {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "imagen_id", type: "uuid" })
  imagenId!: string;

  @ManyToOne(() => ImagenDataset, { onDelete: "CASCADE" })
  @JoinColumn({ name: "imagen_id" })
  imagen!: ImagenDataset;

  @ManyToOne(() => TipoEtiqueta)
  @JoinColumn({ name: "tipo_clave" })
  tipo!: TipoEtiqueta;

  @Column({ name: "tipo_clave", type: "varchar" })
  tipoClave!: string;

  @Column({ type: "varchar" })
  origen!: OrigenEtiqueta;

  @Column({ type: "varchar", nullable: true })
  nota!: string | null;

  @CreateDateColumn({ name: "creado_en" })
  creadoEn!: Date;
}
