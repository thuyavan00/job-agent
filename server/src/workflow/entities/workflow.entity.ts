import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { User } from "@resume/entities/user.entity";
import { WorkflowNode } from "./workflow-node.entity";
import { WorkflowEdge } from "./workflow-edge.entity";
import { WorkflowRun } from "./workflow-run.entity";

export enum WorkflowMode {
  MANUAL = "manual",
  SCHEDULED = "scheduled",
  TRIGGERED = "triggered",
}

export enum WorkflowStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  ARCHIVED = "archived",
}

@Entity({ name: "workflows" })
export class Workflow {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn()
  user: User;

  @Column()
  name: string;

  @Column({ type: "enum", enum: WorkflowMode, default: WorkflowMode.MANUAL })
  mode: WorkflowMode;

  @Column({ type: "enum", enum: WorkflowStatus, default: WorkflowStatus.DRAFT })
  status: WorkflowStatus;

  @OneToMany(() => WorkflowNode, (node) => node.workflow, { cascade: true })
  nodes: WorkflowNode[];

  @OneToMany(() => WorkflowEdge, (edge) => edge.workflow, { cascade: true })
  edges: WorkflowEdge[];

  @OneToMany(() => WorkflowRun, (run) => run.workflow)
  runs: WorkflowRun[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
