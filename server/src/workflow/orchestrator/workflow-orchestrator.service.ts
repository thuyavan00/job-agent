import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Repository } from "typeorm";
import { Queue } from "bullmq";
import { Workflow } from "../entities/workflow.entity";
import { WorkflowNode, NodeSubtype, NodeType } from "../entities/workflow-node.entity";
import { WorkflowEdge } from "../entities/workflow-edge.entity";
import { WorkflowRun, RunStatus, RunTrigger } from "../entities/workflow-run.entity";
import { WorkflowNodeRun, NodeRunStatus } from "../entities/workflow-node-run.entity";
import { BaseNodeHandler } from "./interfaces/node-handler.interface";
import { NODE_HANDLER_MAP } from "./registry/handler-registry";
import { validateWorkflowGraph } from "./graph/graph-validator";
import {
  WORKFLOW_QUEUE,
  WorkflowJobPayload,
} from "./workflow-queue.types";

/** Retry options keyed by NodeSubtype — mirrors ASYNC_JOB_OPTIONS in the processor */
const ASYNC_JOB_OPTIONS: Partial<Record<NodeSubtype, { attempts: number; backoff: { type: string; delay: number } }>> = {
  [NodeSubtype.NEW_JOB_POSTED]:     { attempts: 3, backoff: { type: "exponential", delay: 5_000 } },
  [NodeSubtype.REMOTIVE_JOBS]:      { attempts: 3, backoff: { type: "exponential", delay: 5_000 } },
  [NodeSubtype.ARBEITNOW_JOBS]:     { attempts: 3, backoff: { type: "exponential", delay: 5_000 } },
  [NodeSubtype.GREENHOUSE_JOBS]:    { attempts: 3, backoff: { type: "exponential", delay: 5_000 } },
  [NodeSubtype.LEVER_JOBS]:         { attempts: 3, backoff: { type: "exponential", delay: 5_000 } },
  [NodeSubtype.DAILY_TRIGGER]:      { attempts: 3, backoff: { type: "exponential", delay: 5_000 } },
  [NodeSubtype.WEEKLY_TRIGGER]:     { attempts: 3, backoff: { type: "exponential", delay: 5_000 } },
  [NodeSubtype.TAILOR_RESUME]:      { attempts: 2, backoff: { type: "fixed", delay: 3_000 } },
  [NodeSubtype.SUBMIT_APPLICATION]: { attempts: 5, backoff: { type: "exponential", delay: 10_000 } },
};

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
    @Inject(NODE_HANDLER_MAP) private readonly handlerMap: Map<NodeSubtype, BaseNodeHandler>,
  ) {}

  /**
   * Validates the workflow graph, creates a WorkflowRun, finds trigger nodes
   * (nodes with no incoming edges), and enqueues each as the first BullMQ job.
   */
  async startRun(
    workflowId: string,
    userId: string,
    userEmail: string,
    triggeredBy: RunTrigger = RunTrigger.MANUAL,
  ): Promise<WorkflowRun> {
    // ── Load workflow ──────────────────────────────────────────────────────
    const workflow = await this.workflowRepo.findOne({
      where: { id: workflowId, user: { id: userId } },
      relations: ["nodes", "edges", "edges.source", "edges.target"],
    });
    if (!workflow) throw new NotFoundException("Workflow not found");

    // ── Graph validation ───────────────────────────────────────────────────
    const validation = validateWorkflowGraph(workflow.nodes, workflow.edges);
    if (!validation.valid) {
      throw new BadRequestException(
        `Workflow graph is invalid: ${validation.errors.join("; ")}`,
      );
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
    const nodesWithIncoming = new Set(workflow.edges.map((e) => (e.target as WorkflowNode).id));
    const triggerNodes = workflow.nodes.filter((n) => !nodesWithIncoming.has(n.id));

    // ── Enqueue each trigger node ──────────────────────────────────────────
    for (const node of triggerNodes) {
      const subtype = node.subtype as NodeSubtype;
      const handler = this.handlerMap.get(subtype);

      if (!handler) {
        this.logger.warn(`No handler for trigger subtype "${subtype}" — skipping`);
        continue;
      }

      if (handler.isInline) {
        this.logger.warn(`Trigger node ${node.id} has an inline subtype "${subtype}" — skipping (triggers must be async)`);
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

      const jobOptions = ASYNC_JOB_OPTIONS[subtype] ?? { attempts: 1, backoff: { type: "fixed", delay: 1_000 } };
      await this.queue.add(subtype, payload, {
        ...jobOptions,
        // Stable job ID prevents duplicate enqueues if the endpoint is called twice
        jobId: `${run.id}:${node.id}`,
      });

      this.logger.log(`Enqueued ${subtype} for trigger node ${node.id}`);
    }

    return run;
  }
}
