import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Repository } from "typeorm";
import { Queue } from "bullmq";
import { Workflow } from "../entities/workflow.entity";
import { WorkflowNode, NodeSubtype } from "../entities/workflow-node.entity";
import { WorkflowEdge } from "../entities/workflow-edge.entity";
import { WorkflowRun, RunStatus, RunTrigger } from "../entities/workflow-run.entity";
import { WorkflowNodeRun, NodeRunStatus } from "../entities/workflow-node-run.entity";
import {
  WORKFLOW_QUEUE,
  WorkflowJobName,
  WorkflowJobPayload,
  JOB_OPTIONS,
} from "./workflow-queue.types";

/** NodeSubtypes that are executed inline (no BullMQ job) */
const INLINE_SUBTYPES = new Set<NodeSubtype>([NodeSubtype.JOB_FILTER, NodeSubtype.SALARY_CHECK]);

/** Maps NodeSubtype → BullMQ job name */
function subtypeToJobName(subtype: NodeSubtype): WorkflowJobName | null {
  const map: Partial<Record<NodeSubtype, WorkflowJobName>> = {
    [NodeSubtype.LINKEDIN_JOBS]:      WorkflowJobName.TRIGGER_JOB_MATCH,
    [NodeSubtype.INDEED_JOBS]:        WorkflowJobName.TRIGGER_JOB_MATCH,
    [NodeSubtype.ANGELLIST_JOBS]:     WorkflowJobName.TRIGGER_JOB_MATCH,
    [NodeSubtype.COMPANY_CAREERS]:    WorkflowJobName.TRIGGER_JOB_MATCH,
    [NodeSubtype.DAILY_TRIGGER]:      WorkflowJobName.TRIGGER_JOB_MATCH,
    [NodeSubtype.WEEKLY_TRIGGER]:     WorkflowJobName.TRIGGER_JOB_MATCH,
    [NodeSubtype.TAILOR_RESUME]:      WorkflowJobName.AI_RESUME_TAILOR,
    [NodeSubtype.SUBMIT_APPLICATION]: WorkflowJobName.BROWSER_APPLY,
  };
  return map[subtype] ?? null;
}

@Injectable()
export class WorkflowOrchestratorService {
  private readonly logger = new Logger(WorkflowOrchestratorService.name);

  constructor(
    @InjectQueue(WORKFLOW_QUEUE) private readonly queue: Queue<WorkflowJobPayload>,
    @InjectRepository(Workflow)         private readonly workflowRepo: Repository<Workflow>,
    @InjectRepository(WorkflowNode)     private readonly nodeRepo: Repository<WorkflowNode>,
    @InjectRepository(WorkflowEdge)     private readonly edgeRepo: Repository<WorkflowEdge>,
    @InjectRepository(WorkflowRun)      private readonly runRepo: Repository<WorkflowRun>,
    @InjectRepository(WorkflowNodeRun)  private readonly nodeRunRepo: Repository<WorkflowNodeRun>,
  ) {}

  /**
   * Creates a WorkflowRun, finds trigger nodes (nodes with no incoming edges),
   * and enqueues each as the first BullMQ job in the pipeline.
   */
  async startRun(
    workflowId: string,
    userId: string,
    userEmail: string,
    triggeredBy: RunTrigger = RunTrigger.MANUAL,
  ): Promise<WorkflowRun> {
    // ── Load & validate workflow ───────────────────────────────────────────
    const workflow = await this.workflowRepo.findOne({
      where: { id: workflowId, user: { id: userId } },
      relations: ["nodes", "edges", "edges.source", "edges.target"],
    });
    if (!workflow) throw new NotFoundException("Workflow not found");
    if (workflow.nodes.length === 0) {
      throw new Error("Workflow has no nodes — add at least one trigger node");
    }

    // ── Create the run record ──────────────────────────────────────────────
    const run = await this.runRepo.save(
      this.runRepo.create({
        workflow: { id: workflowId },
        user: { id: userId },
        status: RunStatus.RUNNING,
        triggeredBy,
        startedAt: new Date(),
      }),
    );

    this.logger.log(`WorkflowRun ${run.id} started for workflow "${workflow.name}"`);

    // ── Identify trigger nodes (no incoming edges) ─────────────────────────
    const nodesWithIncoming = new Set(workflow.edges.map((e) => e.target.id));
    const triggerNodes = workflow.nodes.filter((n) => !nodesWithIncoming.has(n.id));

    if (triggerNodes.length === 0) {
      this.logger.warn("No trigger nodes found (all nodes have incoming edges) — run marked failed");
      await this.runRepo.update(run.id, { status: RunStatus.FAILED });
      throw new Error("No trigger node found in workflow");
    }

    // ── Enqueue each trigger node ──────────────────────────────────────────
    for (const node of triggerNodes) {
      const subtype = node.subtype as NodeSubtype;

      if (INLINE_SUBTYPES.has(subtype)) {
        this.logger.warn(`Trigger node ${node.id} has a condition subtype — skipping`);
        continue;
      }

      const jobName = subtypeToJobName(subtype);
      if (!jobName) {
        this.logger.warn(`No handler for trigger subtype "${subtype}" — skipping`);
        continue;
      }

      const nodeRun = await this.nodeRunRepo.save(
        this.nodeRunRepo.create({
          workflowRun: { id: run.id },
          node: { id: node.id },
          status: NodeRunStatus.PENDING,
          input: {},
        }),
      );

      const payload: WorkflowJobPayload = {
        workflowRunId: run.id,
        nodeRunId: nodeRun.id,
        nodeId: node.id,
        subtype,
        config: node.config ?? {},
        input: {},
        userId,
        userEmail,
      };

      await this.queue.add(jobName, payload, {
        ...JOB_OPTIONS[jobName],
        // Stable job ID prevents duplicate enqueues if the endpoint is called twice
        jobId: `${run.id}:${node.id}`,
      });

      this.logger.log(`Enqueued ${jobName} for trigger node ${node.id}`);
    }

    return run;
  }
}
