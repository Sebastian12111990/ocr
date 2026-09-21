import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { MetricaEpoca } from "./metrica-epoca.entidad.js";

export type TipoEntrenamientoYolo = "sondeo" | "auto_etiquetado" | "entrenamiento";

export interface MetricasFinalesYolo {
  map50?: number;
  map50_95?: number;
  precision?: number;
  recall?: number;
}

/**
 * Registro histórico de una corrida de YOLO: un sondeo batch, un pase de
 * auto-etiquetado, o un entrenamiento con épocas. Cada corrida es una fila
 * inmutable — igual que `ejecucion` en el pipeline OCR, no se edita.
 */
@Entity({ name: "entrenamiento_yolo" })
@Index(["creadoEn"])
export class EntrenamientoYolo {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  nombre!: string;

  @Column({ type: "varchar" })
  tipo!: TipoEntrenamientoYolo;

  @Column({ name: "modelo_base", type: "varchar" })
  modeloBase!: string;

  @Column({ type: "jsonb", default: {} })
  parametros!: Record<string, unknown>;

  @Column({ name: "metricas_finales", type: "jsonb", nullable: true })
  metricasFinales!: MetricasFinalesYolo | null;

  @Column({ name: "total_imagenes", type: "int" })
  totalImagenes!: number;

  @Column({ name: "imagenes_con_deteccion", type: "int", nullable: true })
  imagenesConDeteccion!: number | null;

  @Column({ name: "ruta_pesos", type: "varchar", nullable: true })
  rutaPesos!: string | null;

  @Column({ name: "duracion_ms", type: "int" })
  duracionMs!: number;

  @OneToMany(() => MetricaEpoca, (metrica) => metrica.entrenamiento)
  metricasPorEpoca!: MetricaEpoca[];

  @CreateDateColumn({ name: "creado_en" })
  creadoEn!: Date;
}
