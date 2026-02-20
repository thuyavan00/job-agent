import { Processor, WorkerHost, InjectQueue } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Job, Queue } from "bullmq";
import { WorkflowEdge } from "../entities/workflow-edge.entity";
import { WorkflowRun, RunStatus } from "../entities/workflow-run.entity";
import { WorkflowNodeRun, NodeRunStatus } from "../entities/workflow-node-run.entity";
import { NodeSubtype } from "../entities/workflow-node.entity";
import { TriggerJobMatchHandler } from "./handlers/trigger-job-match.handler";
import { AiResumeTailorHandler } from "./handlers/ai-resume-tailor.handler";
import { BrowserApplyHandler } from "./handlers/browser-apply.handler";
import {
  WORKFLOW_QUEUE,
  WorkflowJobName,
  WorkflowJobPayload,
  JOB_OPTIONS,
} from "./workflow-queue.types";
import type { EdgeCondition } from "../entities/workflow-edge.entity";

/** Inline condition evaluator for JOB_FILTER / SALARY_CHECK nodes */
function evalCondition(condition: EdgeCondition, output: Record<string, unknown>): boolean {
  const val = (output as any)[condition.field];
  switch (condition.operator) {
    case "gt":          return Number(val) > Number(condition.value);
    case "lt":          return Number(val) < Number(condition.value);
    case "eq":          return val === condition.value;
    case "neq":         return val !== condition.value;
    case "contains":    return String(val).includes(String(condition.value));
    case "not_contains": return !String(val).includes(String(condition.value));
    default:            return true;
  }
}

/** Maps NodeSubtype → the BullMQ job name to use */
function subtypeToJobName(subtype: NodeSubtype): WorkflowJobName | null {
  const map: Partial<Record<NodeSubtype, WorkflowJobName>> = {
    [NodeSubtype.LINKEDIN_JOBS]:       WorkflowJobName.TRIGGER_JOB_MATCH,
    [NodeSubtype.INDEED_JOBS]:         WorkflowJobName.TRIGGER_JOB_MATCH,
    [NodeSubtype.ANGELLIST_JOBS]:      WorkflowJobName.TRIGGER_JOB_MATCH,
    [NodeSubtype.COMPANY_CAREERS]:     WorkflowJobName.TRIGGER_JOB_MATCH,
    [NodeSubtype.DAILY_TRIGGER]:       WorkflowJobName.TRIGGER_JOB_MATCH,
    [NodeSubtype.WEEKLY_TRIGGER]:      WorkflowJobName.TRIGGER_JOB_MATCH,
    [NodeSubtype.TAILOR_RESUME]:       WorkflowJobName.AI_RESUME_TAILOR,
    [NodeSubtype.SUBMIT_APPLICATION]:  WorkflowJobName.BROWSER_APPLY,
    // JOB_FILTER and SALARY_CHECK are handled inline (no dedicated BullMQ job name)
  };
  return map[subtype] ?? null;
}

@Processor(WORKFLOW_QUEUE)
export class WorkflowExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowExecutionProcessor.name);

  constructor(
    @InjectQueue(WORKFLOW_QUEUE) private readonly queue: Queue<WorkflowJobPayload>,
    @InjectRepository(WorkflowEdge)   private readonly edgeRepo: Repository<WorkflowEdge>,
    @InjectRepository(WorkflowRun)    private readonly runRepo: Repository<WorkflowRun>,
    @InjectRepository(WorkflowNodeRun) private readonly nodeRunRepo: Repository<WorkflowNodeRun>,
    private readonly triggerHandler: TriggerJobMatchHandler,
    private readonly tailorHandler: AiResumeTailorHandler,
    private readonly applyHandler: BrowserApplyHandler,
  ) {
    super();
  }

  // ── Main dispatch method ────────────────────────────────────────────────────

  async process(job: Job<WorkflowJobPayload>): Promise<void> {
    const payload = job.data;
    this.logger.log(`Processing job ${job.name} — nodeRunId: ${payload.nodeRunId}`);

    // Mark as running
    await this.nodeRunRepo.update(payload.nodeRunId, {
      status: NodeRunStatus.RUNNING,
      startedAt: new Date(),
    });

    let output: Record<string, unknown>;
    try {
      output = await this.dispatchToHandler(job.name as WorkflowJobName, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job ${job.name} failed: ${message}`);
      await this.nodeRunRepo.update(payload.nodeRunId, {
        status: NodeRunStatus.FAILED,
        error: message,
        completedAt: new Date(),
      });
      // Re-throw so BullMQ applies its retry / failed policy
      throw err;
    }

    // Persist completed state
    await this.nodeRunRepo.update(payload.nodeRunId, {
      status: NodeRunStatus.COMPLETED,
      output: output as any,
      completedAt: new Date(),
    });

    this.logger.log(`Job ${job.name} completed — nodeRunId: ${payload.nodeRunId}`);

    // ── Advance the workflow graph ─────────────────────────────────────────
    await this.advanceGraph(payload, output);

    // ── Check if the whole run is done ─────────────────────────────────────
    await this.reconcileRunStatus(payload.workflowRunId);
  }

  // ── Route job name → handler ────────────────────────────────────────────────

  private async dispatchToHandler(
    jobName: WorkflowJobName,
    payload: WorkflowJobPayload,
  ): Promise<Record<string, unknown>> {
    switch (jobName) {
      case WorkflowJobName.TRIGGER_JOB_MATCH:
        return this.triggerHandler.handle(payload) as unknown as Promise<Record<string, unknown>>;
      case WorkflowJobName.AI_RESUME_TAILOR:
        return this.tailorHandler.handle(payload) as unknown as Promise<Record<string, unknown>>;
      case WorkflowJobName.BROWSER_APPLY:
        return this.applyHandler.handle(payload) as unknown as Promise<Record<string, unknown>>;
      default:
        throw new Error(`Unknown job name: ${jobName}`);
    }
  }

  // ── Graph traversal: create + enqueue next node jobs ──────────────────────

  private async advanceGraph(
    payload: WorkflowJobPayload,
    nodeOutput: Record<string, unknown>,
  ): Promise<void> {
    // Load outgoing edges for this node (with target node data)
    const outgoingEdges = await this.edgeRepo.find({
      where: { source: { id: payload.nodeId } },
      relations: ["target"],
    });

    if (outgoingEdges.length === 0) {
      this.logger.log(`No outgoing edges from node ${payload.nodeId} — branch complete`);
      return;
    }

    for (const edge of outgoingEdges) {
      // Evaluate conditional edges (JOB_FILTER / SALARY_CHECK branches)
      if (edge.condition && !evalCondition(edge.condition, nodeOutput)) {
        this.logger.log(`Edge condition not met — skipping branch to node ${edge.target.id}`);
        continue;
      }

      const nextNode = edge.target;
      const nextSubtype = nextNode.subtype as NodeSubtype;

      // ── Inline condition nodes: filter & pass through, no BullMQ job ──────
      if (nextSubtype === NodeSubtype.JOB_FILTER || nextSubtype === NodeSubtype.SALARY_CHECK) {
        const filteredOutput = this.applyNodeFilter(nextNode.config as any, nextSubtype, nodeOutput);

        const condNodeRun = this.nodeRunRepo.create({
          workflowRun: { id: payload.workflowRunId },
          node: { id: nextNode.id },
          status: NodeRunStatus.COMPLETED,
          input: nodeOutput,
          output: filteredOutput,
          startedAt: new Date(),
          completedAt: new Date(),
        });
        const savedCondRun = await this.nodeRunRepo.save(condNodeRun);

        // Recurse: advance from this condition node
        await this.advanceGraph(
          { ...payload, nodeId: nextNode.id, nodeRunId: savedCondRun.id },
          filteredOutput,
        );
        continue;
      }

      // ── Async nodes: enqueue as BullMQ job ─────────────────────────────────
      const jobName = subtypeToJobName(nextSubtype);
      if (!jobName) {
        this.logger.warn(`No handler mapped for subtype "${nextSubtype}" — skipping`);
        continue;
      }

      const nextNodeRun = this.nodeRunRepo.create({
        workflowRun: { id: payload.workflowRunId },
        node: { id: nextNode.id },
        status: NodeRunStatus.PENDING,
        input: nodeOutput,
      });
      const savedNextRun = await this.nodeRunRepo.save(nextNodeRun);

      const nextPayload: WorkflowJobPayload = {
        workflowRunId: payload.workflowRunId,
        nodeRunId: savedNextRun.id,
        nodeId: nextNode.id,
        subtype: nextSubtype,
        config: nextNode.config ?? {},
        input: nodeOutput,
        userId: payload.userId,
        userEmail: payload.userEmail,
      };

      await this.queue.add(jobName, nextPayload, JOB_OPTIONS[jobName]);
      this.logger.log(`Enqueued ${jobName} for node ${nextNode.id} (nodeRun ${savedNextRun.id})`);
    }
  }

  // ── Inline filter logic for condition nodes ─────────────────────────────────

  private applyNodeFilter(
    config: Record<string, any>,
    subtype: NodeSubtype,
    input: Record<string, unknown>,
  ): Record<string, unknown> {
    const jobs = (input as any).jobs ?? [];

    if (subtype === NodeSubtype.JOB_FILTER) {
      const { minSalary, maxSalary, requiredKeywords = [], excludeCompanies = [], remoteOnly } = config;
      const filtered = jobs.filter((j: any) => {
        if (remoteOnly && !j.location.toLowerCase().includes("remote")) return false;
        if (excludeCompanies.some((c: string) => j.company.toLowerCase().includes(c.toLowerCase()))) return false;
        if (requiredKeywords.length && !requiredKeywords.some((kw: string) => j.title.toLowerCase().includes(kw.toLowerCase()))) return false;
        return true;
      });
      return { ...input, jobs: filtered };
    }

    if (subtype === NodeSubtype.SALARY_CHECK) {
      // Salary data is often missing from public APIs — pass through if unparseable
      const { minSalary = 0 } = config;
      const filtered = jobs.filter((j: any) => {
        const salaryMatch = String(j.salary ?? "").match(/\d+/);
        if (!salaryMatch) return true; // no salary listed → don't filter out
        return Number(salaryMatch[0]) >= Number(minSalary);
      });
      return { ...input, jobs: filtered };
    }

    return input;
  }

  // ── Mark the WorkflowRun COMPLETED when all node runs are done ─────────────

  private async reconcileRunStatus(workflowRunId: string): Promise<void> {
    const nodeRuns = await this.nodeRunRepo.find({
      where: { workflowRun: { id: workflowRunId } },
    });

    const allDone = nodeRuns.every(
      (nr) => nr.status === NodeRunStatus.COMPLETED || nr.status === NodeRunStatus.SKIPPED,
    );
    const anyFailed = nodeRuns.some((nr) => nr.status === NodeRunStatus.FAILED);
    const anyPending = nodeRuns.some(
      (nr) => nr.status === NodeRunStatus.PENDING || nr.status === NodeRunStatus.RUNNING,
    );

    if (anyPending) return; // more jobs still in flight

    const finalStatus = anyFailed ? RunStatus.FAILED : allDone ? RunStatus.COMPLETED : RunStatus.RUNNING;

    await this.runRepo.update(workflowRunId, {
      status: finalStatus,
      completedAt: anyPending ? undefined : new Date(),
    });

    this.logger.log(`WorkflowRun ${workflowRunId} → ${finalStatus}`);
  }
}
