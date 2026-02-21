import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { User } from "@resume/entities/user.entity";
import { Workflow } from "./workflow.entity";
import { WorkflowNodeRun } from "./workflow-node-run.entity";

export enum RunStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum RunTrigger {
  MANUAL = "manual",
  SCHEDULE = "schedule",
  EVENT = "event",
}

@Entity({ name: "workflow_runs" })
export class WorkflowRun {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Workflow, (workflow) => workflow.runs, { onDelete: "CASCADE" })
  @JoinColumn()
  workflow: Workflow;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn()
  user: User;

  @Column({ type: "enum", enum: RunStatus, default: RunStatus.PENDING })
  status: RunStatus;

  @Column({ type: "enum", enum: RunTrigger })
  triggeredBy: RunTrigger;

  @OneToMany(() => WorkflowNodeRun, (nr) => nr.workflowRun, { cascade: true })
  nodeRuns: WorkflowNodeRun[];

  @Column({ type: "timestamp", nullable: true })
  startedAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
