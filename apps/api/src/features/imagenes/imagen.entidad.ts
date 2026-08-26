import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "imagen" })
export class Imagen {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "nombre_archivo", type: "varchar", unique: true })
  nombreArchivo!: string;

  @Column({ name: "ruta_relativa", type: "varchar" })
  rutaRelativa!: string;

  @Column({ type: "int" })
  ancho!: number;

  @Column({ type: "int" })
  alto!: number;

  @Column({ name: "patente_esperada", type: "varchar", nullable: true })
  patenteEsperada!: string | null;

  @CreateDateColumn({ name: "creado_en" })
  creadoEn!: Date;
}
