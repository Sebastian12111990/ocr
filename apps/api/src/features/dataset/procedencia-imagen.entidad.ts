import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

/**
 * De qué planta y en qué fecha se capturó una imagen del dataset. Se carga en
 * bloque desde `procedencia.csv` (generado por `batch_detect.py` al recorrer
 * `D:\imagenes - copia\<planta>\<YYYY-MM-DD>\`) vía `scripts/cargar-procedencia.ts` —
 * ver docs/procedencia-imagenes.md para el porqué de este flujo (CSV, no HTTP directo).
 */
@Entity({ name: "procedencia_imagen" })
@Unique(["nombreArchivo"])
@Index(["planta", "fecha"])
export class ProcedenciaImagen {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "nombre_archivo", type: "varchar" })
  nombreArchivo!: string;

  @Column({ type: "varchar" })
  planta!: string;

  @Column({ type: "date" })
  fecha!: string;

  @CreateDateColumn({ name: "creado_en" })
  creadoEn!: Date;
}
