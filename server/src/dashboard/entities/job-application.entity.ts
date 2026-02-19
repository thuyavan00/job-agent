import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum ApplicationStatus {
  APPLIED = "applied",
  INTERVIEW = "interview",
  OFFER = "offer",
  REJECTED = "rejected",
  WITHDRAWN = "withdrawn",
}

@Entity({ name: "job_applications" })
export class JobApplication {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userEmail: string;

  @Column()
  jobTitle: string;

  @Column()
  company: string;

  @Column({ nullable: true })
  salary: string;

  @Column({ type: "enum", enum: ApplicationStatus, default: ApplicationStatus.APPLIED })
  status: ApplicationStatus;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ nullable: true })
  sourceUrl: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  appliedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
