import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { WorkflowRun } from "./workflow-run.entity";
import { WorkflowNode } from "./workflow-node.entity";

export enum NodeRunStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped",
}

@Entity({ name: "workflow_node_runs" })
export class WorkflowNodeRun {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => WorkflowRun, (run) => run.nodeRuns, { onDelete: "CASCADE" })
  @JoinColumn()
  workflowRun: WorkflowRun;

  @ManyToOne(() => WorkflowNode, (node) => node.nodeRuns, { onDelete: "CASCADE" })
  @JoinColumn()
  node: WorkflowNode;

  @Column({ type: "enum", enum: NodeRunStatus, default: NodeRunStatus.PENDING })
  status: NodeRunStatus;

  /** Data received from the previous node in the pipeline */
  @Column({ type: "jsonb", nullable: true })
  input?: Record<string, unknown>;

  /** Data produced by this node (jobs list, tailored resume, etc.) */
  @Column({ type: "jsonb", nullable: true })
  output?: Record<string, unknown>;

  @Column({ type: "text", nullable: true })
  error?: string;

  @Column({ type: "timestamp", nullable: true })
  startedAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
