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
import { Workflow } from "./workflow.entity";
import { WorkflowNodeRun } from "./workflow-node-run.entity";

export enum NodeType {
  TRIGGER = "trigger",
  CONDITION = "condition",
  ACTION = "action",
}

export enum NodeSubtype {
  // Triggers — Job Portals
  LINKEDIN_JOBS = "linkedin_jobs",
  INDEED_JOBS = "indeed_jobs",
  ANGELLIST_JOBS = "angellist_jobs",
  COMPANY_CAREERS = "company_careers",
  // Triggers — Schedule
  DAILY_TRIGGER = "daily_trigger",
  WEEKLY_TRIGGER = "weekly_trigger",
  // Conditions — Logic
  JOB_FILTER = "job_filter",
  SALARY_CHECK = "salary_check",
  // Actions — Applications
  SUBMIT_APPLICATION = "submit_application",
  TAILOR_RESUME = "tailor_resume",
}

export enum NodeSetupStatus {
  CONFIGURED = "configured",
  NEEDS_SETUP = "needs_setup",
}

/**
 * Per-subtype config JSONB shapes:
 *
 * linkedin_jobs / indeed_jobs / angellist_jobs / company_careers:
 *   { portal, keywords: string[], location, jobType?, remote?, companyUrls? }
 *
 * daily_trigger / weekly_trigger:
 *   { cronExpression: string, timezone: string }
 *
 * job_filter:
 *   { minSalary?, maxSalary?, requiredKeywords?, excludeCompanies?, remoteOnly?, locationsAllowed? }
 *
 * salary_check:
 *   { minSalary: number, currency: 'USD' | 'EUR' | 'GBP' }
 *
 * submit_application:
 *   { resumeProfileId: string, autoTailor: boolean, coverLetterEnabled: boolean, portfolioUrl? }
 *
 * tailor_resume:
 *   { resumeProfileId: string }
 */

@Entity({ name: "workflow_nodes" })
export class WorkflowNode {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Workflow, (workflow) => workflow.nodes, { onDelete: "CASCADE" })
  @JoinColumn()
  workflow: Workflow;

  @Column()
  label: string;

  @Column({ type: "enum", enum: NodeType })
  type: NodeType;

  @Column({ type: "enum", enum: NodeSubtype })
  subtype: NodeSubtype;

  /** React Flow canvas X coordinate */
  @Column({ type: "float", default: 0 })
  positionX: number;

  /** React Flow canvas Y coordinate */
  @Column({ type: "float", default: 0 })
  positionY: number;

  /** Subtype-specific configuration */
  @Column({ type: "jsonb", nullable: true })
  config: Record<string, unknown>;

  @Column({ type: "enum", enum: NodeSetupStatus, default: NodeSetupStatus.NEEDS_SETUP })
  setupStatus: NodeSetupStatus;

  @OneToMany(() => WorkflowNodeRun, (nr) => nr.node)
  nodeRuns: WorkflowNodeRun[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
