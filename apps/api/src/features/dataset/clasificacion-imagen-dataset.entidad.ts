import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

import type { OrigenImagenDataset } from "./dataset.types.js";

export type PerspectivaClasificacion = "patente_sin_vehiculo" | "descartada_sin_vehiculo" | "caso_dificil";
export type MotivoCasoDificil = "brillo" | "suciedad" | "otro";

/**
 * Marca manual sobre una imagen del dataset — no reemplaza el filesystem,
 * solo registra decisiones humanas (aceptar/descartar un hallazgo, o etiquetar
 * un caso difícil) para poder armar perspectivas curadas sobre los datos crudos.
 */
@Entity({ name: "clasificacion_imagen_dataset" })
@Unique(["nombreArchivo", "origen"])
@Index(["perspectiva"])
export class ClasificacionImagenDataset {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "nombre_archivo", type: "varchar" })
  nombreArchivo!: string;

  @Column({ type: "varchar" })
  origen!: OrigenImagenDataset;

  @Column({ type: "varchar" })
  perspectiva!: PerspectivaClasificacion;

  @Column({ type: "varchar", nullable: true })
  motivo!: MotivoCasoDificil | null;

  @CreateDateColumn({ name: "creado_en" })
  creadoEn!: Date;
}
