import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Imagen } from "../imagenes/imagen.entidad.js";
import { Preset } from "../presets/preset.entidad.js";
import type { EtapaPipeline } from "../../shared/contrato/pipeline.js";
import { CandidatoEjecucion } from "./candidato-ejecucion.entidad.js";

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

  @Column({ name: "pipeline_version", type: "int", default: 1 })
  pipelineVersion!: number;

  @Column({ name: "patente_esperada", type: "varchar", nullable: true })
  patenteEsperada!: string | null;

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

  @Column({ name: "mejor_coincidencia", type: "real", nullable: true })
  mejorCoincidencia!: number | null;

  @Column({ name: "imagen_procesada_png", type: "bytea", nullable: true, select: false })
  imagenProcesadaPng!: Buffer | null;

  @OneToMany(() => CandidatoEjecucion, (candidato) => candidato.ejecucion)
  candidatos!: CandidatoEjecucion[];

  @CreateDateColumn({ name: "creado_en" })
  creadoEn!: Date;
}
