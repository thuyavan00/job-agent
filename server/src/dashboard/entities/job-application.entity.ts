import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum ApplicationStatus {
  APPLIED = "applied",
  SCREENING = "screening",
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
  location: string;

  @Column({ nullable: true })
  salary: string;

  @Column({ type: "enum", enum: ApplicationStatus, default: ApplicationStatus.APPLIED })
  status: ApplicationStatus;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ nullable: true })
  sourceUrl: string;

  /** Human-readable source label, e.g. "LinkedIn", "Indeed", "Referral" */
  @Column({ nullable: true })
  source: string;

  /** Short description of the next required action, e.g. "Technical Interview" */
  @Column({ nullable: true })
  nextAction: string;

  @Column({ type: "timestamp", nullable: true })
  nextActionDate: Date;

  /** Set when the application was created by an automated workflow run */
  @Column({ nullable: true })
  workflowRunId: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  appliedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
