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
  // Generic job-source trigger (portal selected in config.portal)
  NEW_JOB_POSTED = "new_job_posted",
  // Triggers — specific Job Sources (match JobDto.source values returned by JobsService)
  REMOTIVE_JOBS = "remotive_jobs",
  ARBEITNOW_JOBS = "arbeitnow_jobs",
  GREENHOUSE_JOBS = "greenhouse_jobs",
  LEVER_JOBS = "lever_jobs",
  // Triggers — Schedule
  DAILY_TRIGGER = "daily_trigger",
  WEEKLY_TRIGGER = "weekly_trigger",
  // Conditions — Logic
  JOB_FILTER = "job_filter",
  SALARY_CHECK = "salary_check",
  LOCATION_CHECK = "location_check",
  // Actions — Applications
  SUBMIT_APPLICATION = "submit_application",
  TAILOR_RESUME = "tailor_resume",
  SAVE_JOB = "save_job",
  GENERATE_COVER_LETTER = "generate_cover_letter",
  // Actions — Communication
  SEND_EMAIL = "send_email",
  LINKEDIN_MESSAGE = "linkedin_message",
  SLACK_NOTIFICATION = "slack_notification",
}

export enum NodeSetupStatus {
  CONFIGURED = "configured",
  NEEDS_SETUP = "needs_setup",
}

/**
 * Per-subtype config JSONB shapes:
 *
 * new_job_posted:
 *   { portal: "remotive"|"arbeitnow"|"greenhouse"|"lever", keywords: string, location?, remoteOnly? }
 *   portal is required; maps to JobDto.source via PORTAL_TO_SOURCE in the handler.
 *
 * remotive_jobs:
 *   { keywords?: string, remoteOnly?: boolean }
 *   Source is inferred from subtype ("Remotive").
 *
 * arbeitnow_jobs:
 *   { keywords?: string, location?: string, remoteOnly?: boolean }
 *   Source is inferred from subtype ("Arbeitnow").
 *
 * greenhouse_jobs:
 *   { keywords?: string, companies?: string[] }
 *   Source is inferred from subtype ("Greenhouse"). companies filters from the curated list.
 *
 * lever_jobs:
 *   { keywords?: string, companies?: string[] }
 *   Source is inferred from subtype ("Lever"). companies filters from the curated list.
 *
 * daily_trigger / weekly_trigger:
 *   { time: string, dayOfWeek?: string }
 *
 * job_filter:
 *   { minSalary?, jobType?, remoteOnly? }
 *
 * salary_check:
 *   { minSalary: number, maxSalary?: number }
 *
 * location_check:
 *   { acceptedLocations: string }
 *
 * submit_application:
 *   { resumeProfileId: string, autoTailor: boolean, coverLetterEnabled: boolean }
 *
 * tailor_resume:
 *   { style: "standard"|"aggressive"|"conservative" }
 *
 * save_job:
 *   { defaultStatus: "applied"|"interview"|"offer" }
 *
 * generate_cover_letter:
 *   { tone: "professional"|"enthusiastic"|"concise" }
 *
 * send_email:
 *   { to: string, subject: string }
 *
 * linkedin_message:
 *   { messageType: "connection"|"inmail" }
 *
 * slack_notification:
 *   { webhookUrl: string }
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
