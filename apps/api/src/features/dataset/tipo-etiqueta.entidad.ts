import { Column, Entity, PrimaryColumn } from "typeorm";

export type FamiliaTipoEtiqueta = "deteccion" | "calidad" | "revision";

/** Catálogo editable de etiquetas — agregar una nueva es un INSERT, no una migración. */
@Entity({ name: "tipo_etiqueta" })
export class TipoEtiqueta {
  @PrimaryColumn({ type: "varchar" })
  clave!: string;

  @Column({ type: "varchar" })
  nombre!: string;

  @Column({ type: "varchar" })
  familia!: FamiliaTipoEtiqueta;

  @Column({ type: "int" })
  orden!: number;

  @Column({ type: "boolean" })
  activa!: boolean;
}
