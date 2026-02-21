import type { JobDto } from "@jobs/jobs.dto";

export const WORKFLOW_QUEUE = "workflow-execution";

export enum WorkflowJobName {
  TRIGGER_JOB_MATCH = "TRIGGER_JOB_MATCH",
  AI_RESUME_TAILOR = "AI_RESUME_TAILOR",
  BROWSER_APPLY = "BROWSER_APPLY",
}

/** BullMQ retry policy per job type */
export const JOB_OPTIONS: Record<WorkflowJobName, { attempts: number; backoff: { type: string; delay: number } }> = {
  [WorkflowJobName.TRIGGER_JOB_MATCH]: { attempts: 3, backoff: { type: "exponential", delay: 5_000 } },
  [WorkflowJobName.AI_RESUME_TAILOR]: { attempts: 2, backoff: { type: "fixed", delay: 3_000 } },
  // Browser automation is inherently flaky — more retries with longer back-off
  [WorkflowJobName.BROWSER_APPLY]: { attempts: 5, backoff: { type: "exponential", delay: 10_000 } },
};

/** Data passed into every BullMQ job */
export interface WorkflowJobPayload {
  workflowRunId: string;
  nodeRunId: string;
  nodeId: string;
  /** NodeSubtype value — used by the processor to pick the right handler */
  subtype: string;
  /** Node-level config JSONB (portal, keywords, resumeProfileId, …) */
  config: Record<string, unknown>;
  /** Output produced by the immediately-preceding node (empty for trigger nodes) */
  input: Record<string, unknown>;
  userId: string;
  userEmail: string;
}

/** Shape of data flowing from TRIGGER_JOB_MATCH to downstream nodes */
export interface TriggerOutput {
  jobs: JobDto[];
}

/** Shape of data flowing from AI_RESUME_TAILOR to BROWSER_APPLY */
export interface TailorOutput {
  tailoredResume: string;
  job: JobDto;
}

/** Shape of data produced by BROWSER_APPLY */
export interface ApplyOutput {
  applicationId: string;
  success: boolean;
}
