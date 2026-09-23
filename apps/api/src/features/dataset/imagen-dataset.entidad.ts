import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

/**
 * El disco guarda solo lo que no se puede regenerar: la imagen original y su
 * procedencia (derivada de `rutaRelativa`, ver ServicioDataset.indexar). Todo lo
 * demás — detecciones, juicio humano — vive en `deteccion_imagen`/`etiqueta_imagen`.
 * Ver docs/decisiones-modelo-dataset.md.
 */
@Entity({ name: "imagen_dataset" })
@Unique(["rutaRelativa"])
@Index(["nombreArchivo"])
@Index(["planta", "fecha"])
export class ImagenDataset {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "ruta_relativa", type: "varchar" })
  rutaRelativa!: string;

  @Column({ name: "nombre_archivo", type: "varchar" })
  nombreArchivo!: string;

  @Column({ type: "varchar", nullable: true })
  planta!: string | null;

  @Column({ type: "date", nullable: true })
  fecha!: string | null;

  @Column({ type: "int" })
  ancho!: number;

  @Column({ type: "int" })
  alto!: number;

  @Column({ name: "tamano_bytes", type: "bigint" })
  tamanoBytes!: string;

  @Column({ name: "indexado_en", type: "timestamptz" })
  indexadoEn!: Date;

  @Column({ name: "visto_en", type: "timestamptz" })
  vistoEn!: Date;
}
