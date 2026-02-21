import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum PrepStatus {
  PREP_PENDING = "prep-pending",
  PREPPING = "prepping",
  READY = "ready",
}

@Entity({ name: "interviews" })
export class Interview {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userEmail: string;

  @Column()
  jobTitle: string;

  @Column()
  company: string;

  @Column({ type: "timestamp" })
  scheduledAt: Date;

  @Column({ type: "enum", enum: PrepStatus, default: PrepStatus.PREP_PENDING })
  prepStatus: PrepStatus;

  @Column({ type: "text", nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
