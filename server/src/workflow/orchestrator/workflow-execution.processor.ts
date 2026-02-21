import { Processor, WorkerHost, InjectQueue } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Job, Queue } from "bullmq";
import { WorkflowEdge } from "../entities/workflow-edge.entity";
import { WorkflowNode, NodeSubtype } from "../entities/workflow-node.entity";
import { WorkflowRun, RunStatus } from "../entities/workflow-run.entity";
import { WorkflowNodeRun, NodeRunStatus } from "../entities/workflow-node-run.entity";
import { BaseNodeHandler, NodeExecutionContext } from "./interfaces/node-handler.interface";
import { NODE_HANDLER_MAP } from "./registry/handler-registry";
import {
  WORKFLOW_QUEUE,
  WorkflowJobPayload,
} from "./workflow-queue.types";
import type { EdgeCondition } from "../entities/workflow-edge.entity";

/** Retry options keyed by NodeSubtype (async handlers only) */
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

/** Inline condition evaluator for edge conditions */
function evalCondition(condition: EdgeCondition, output: Record<string, unknown>): boolean {
  const val = (output as any)[condition.field];
  switch (condition.operator) {
    case "gt":          return Number(val) > Number(condition.value);
    case "lt":          return Number(val) < Number(condition.value);
    case "eq":          return val === condition.value;
    case "neq":         return val !== condition.value;
    case "contains":
      if (Array.isArray(val)) return val.includes(condition.value);
      return String(val).includes(String(condition.value));
    case "not_contains":
      if (Array.isArray(val)) return !val.includes(condition.value);
      return !String(val).includes(String(condition.value));
    default:            return true;
  }
}

@Processor(WORKFLOW_QUEUE)
export class WorkflowExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowExecutionProcessor.name);

  constructor(
    @InjectQueue(WORKFLOW_QUEUE) private readonly queue: Queue<WorkflowJobPayload>,
    @InjectRepository(WorkflowEdge)    private readonly edgeRepo: Repository<WorkflowEdge>,
    @InjectRepository(WorkflowRun)     private readonly runRepo: Repository<WorkflowRun>,
    @InjectRepository(WorkflowNodeRun) private readonly nodeRunRepo: Repository<WorkflowNodeRun>,
    @Inject(NODE_HANDLER_MAP) private readonly handlerMap: Map<NodeSubtype, BaseNodeHandler>,
  ) {
    super();
  }

  // ── Main dispatch method ────────────────────────────────────────────────────

  async process(job: Job<WorkflowJobPayload>): Promise<void> {
    const payload = job.data;
    const subtype = payload.subtype as NodeSubtype;
    this.logger.log(`Processing job ${job.name} (${subtype}) — nodeRunId: ${payload.nodeRunId}`);

    // Mark node as running
    await this.nodeRunRepo.update(payload.nodeRunId, {
      status: NodeRunStatus.RUNNING,
      startedAt: new Date(),
    });

    let output: Record<string, unknown>;
    try {
      const handler = this.handlerMap.get(subtype);
      if (!handler) {
        throw new Error(`No handler registered for subtype "${subtype}"`);
      }
      const ctx: NodeExecutionContext = { payload };
      const result = await handler.execute(ctx);
      output = result.output;
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

  // ── Graph traversal: fan-in-aware, dedup-guarded ───────────────────────────

  private async advanceGraph(
    payload: WorkflowJobPayload,
    nodeOutput: Record<string, unknown>,
  ): Promise<void> {
    const outgoingEdges = await this.edgeRepo.find({
      where: { source: { id: payload.nodeId } },
      relations: ["target"],
    });

    if (outgoingEdges.length === 0) {
      this.logger.log(`No outgoing edges from node ${payload.nodeId} — branch complete`);
      return;
    }

    for (const edge of outgoingEdges) {
      // Evaluate conditional edges
      if (edge.condition && !evalCondition(edge.condition, nodeOutput)) {
        this.logger.log(`Edge condition not met — skipping branch to node ${edge.target.id}`);
        continue;
      }

      const nextNode = edge.target as WorkflowNode;
      const nextSubtype = nextNode.subtype as NodeSubtype;

      // ── Fan-in dedup guard: skip if a NodeRun already exists for this node+run ──
      const existingRun = await this.nodeRunRepo.findOne({
        where: {
          workflowRun: { id: payload.workflowRunId },
          node: { id: nextNode.id },
        },
      });
      if (existingRun) {
        this.logger.debug(
          `NodeRun already exists for node ${nextNode.id} in run ${payload.workflowRunId} — skipping duplicate`
        );
        continue;
      }

      // ── Fan-in readiness guard: all predecessor NodeRuns must be complete ──
      const allPredecessorsDone = await this.checkPredecessorsDone(
        nextNode.id,
        payload.workflowRunId,
        payload.nodeId,
      );
      if (!allPredecessorsDone) {
        this.logger.debug(
          `Predecessors of node ${nextNode.id} not all done yet — waiting for fan-in`
        );
        continue;
      }

      const handler = this.handlerMap.get(nextSubtype);

      // ── Inline handlers: execute synchronously, recurse ───────────────────
      if (handler?.isInline) {
        const ctx: NodeExecutionContext = {
          payload: {
            ...payload,
            nodeId: nextNode.id,
            subtype: nextSubtype,
            config: nextNode.config ?? {},
            input: nodeOutput,
          },
        };

        let inlineOutput: Record<string, unknown>;
        try {
          const result = await handler.execute(ctx);
          inlineOutput = result.output;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const condNodeRun = this.nodeRunRepo.create({
            workflowRun: { id: payload.workflowRunId },
            node: { id: nextNode.id },
            status: NodeRunStatus.FAILED,
            input: nodeOutput,
            error: message,
            startedAt: new Date(),
            completedAt: new Date(),
          });
          await this.nodeRunRepo.save(condNodeRun);
          this.logger.error(`Inline handler for ${nextSubtype} failed: ${message}`);
          continue;
        }

        const condNodeRun = this.nodeRunRepo.create({
          workflowRun: { id: payload.workflowRunId },
          node: { id: nextNode.id },
          status: NodeRunStatus.COMPLETED,
          input: nodeOutput,
          output: inlineOutput,
          startedAt: new Date(),
          completedAt: new Date(),
        });
        const savedCondRun = await this.nodeRunRepo.save(condNodeRun);

        // Recurse: advance from this inline node
        await this.advanceGraph(
          { ...payload, nodeId: nextNode.id, nodeRunId: savedCondRun.id },
          inlineOutput,
        );
        continue;
      }

      // ── Async handlers: enqueue as BullMQ job ─────────────────────────────
      if (!handler) {
        this.logger.warn(`No handler registered for subtype "${nextSubtype}" — skipping`);
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

      const jobOptions = ASYNC_JOB_OPTIONS[nextSubtype] ?? { attempts: 1, backoff: { type: "fixed", delay: 1_000 } };
      await this.queue.add(nextSubtype, nextPayload, jobOptions);
      this.logger.log(`Enqueued ${nextSubtype} for node ${nextNode.id} (nodeRun ${savedNextRun.id})`);
    }
  }

  /**
   * Checks that all predecessor nodes (incoming edges) for `nodeId` have a completed NodeRun,
   * excluding `currentNodeId` (which just finished, triggering this check).
   */
  private async checkPredecessorsDone(
    nodeId: string,
    workflowRunId: string,
    currentNodeId: string,
  ): Promise<boolean> {
    const incomingEdges = await this.edgeRepo.find({
      where: { target: { id: nodeId } },
      relations: ["source"],
    });

    // Only check predecessors other than the current completing node
    const otherPredecessorIds = incomingEdges
      .map((e) => (e.source as WorkflowNode).id)
      .filter((id) => id !== currentNodeId);

    if (otherPredecessorIds.length === 0) return true;

    for (const predId of otherPredecessorIds) {
      const predRun = await this.nodeRunRepo.findOne({
        where: {
          workflowRun: { id: workflowRunId },
          node: { id: predId },
        },
      });
      if (!predRun || predRun.status !== NodeRunStatus.COMPLETED) {
        return false;
      }
    }

    return true;
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
      completedAt: new Date(),
    });

    this.logger.log(`WorkflowRun ${workflowRunId} → ${finalStatus}`);
  }
}
