import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { Workflow } from "./workflow.entity";
import { WorkflowNode } from "./workflow-node.entity";

export type EdgeCondition = {
  field: string;
  operator: "gt" | "lt" | "eq" | "neq" | "contains" | "not_contains";
  value: unknown;
};

@Entity({ name: "workflow_edges" })
export class WorkflowEdge {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Workflow, (workflow) => workflow.edges, { onDelete: "CASCADE" })
  @JoinColumn()
  workflow: Workflow;

  @ManyToOne(() => WorkflowNode, { onDelete: "CASCADE" })
  @JoinColumn()
  source: WorkflowNode;

  @ManyToOne(() => WorkflowNode, { onDelete: "CASCADE" })
  @JoinColumn()
  target: WorkflowNode;

  /** Optional label shown on the edge (e.g. "true" / "false" for condition branches) */
  @Column({ nullable: true })
  label?: string;

  /** Predicate evaluated at runtime for condition node branches */
  @Column({ type: "jsonb", nullable: true })
  condition?: EdgeCondition;

  @CreateDateColumn()
  createdAt: Date;
}
