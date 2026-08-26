import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Imagen } from "../imagenes/imagen.entidad.js";
import { Preset } from "../presets/preset.entidad.js";
import type { EtapaPipeline } from "../../shared/contrato/pipeline.js";

/**
 * Registro de una ejecución de OCR: qué pipeline se usó, sobre qué imagen, y
 * qué salió — la tabla que responde "qué ajustes funcionan para qué imagen".
 * `etapas` es un snapshot (no una referencia al preset) para que editar un
 * preset después no reescriba el historial.
 */
@Entity({ name: "ejecucion" })
@Index(["imagen", "acierto"])
export class Ejecucion {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Imagen, { onDelete: "CASCADE" })
  @JoinColumn({ name: "imagen_id" })
  imagen!: Imagen;

  @ManyToOne(() => Preset, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "preset_id" })
  preset!: Preset | null;

  @Column({ type: "varchar" })
  modo!: "fijo" | "libre";

  @Column({ type: "jsonb" })
  etapas!: EtapaPipeline[];

  @Column({ name: "texto_detectado", type: "varchar", nullable: true })
  textoDetectado!: string | null;

  @Column({ type: "real", nullable: true })
  confianza!: number | null;

  @Column({ type: "boolean", default: false })
  acierto!: boolean;

  @Column({ name: "distancia_edicion", type: "int", nullable: true })
  distanciaEdicion!: number | null;

  @Column({ name: "duracion_ms", type: "int" })
  duracionMs!: number;

  @CreateDateColumn({ name: "creado_en" })
  creadoEn!: Date;
}
