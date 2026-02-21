import type { WorkflowJobPayload } from "../workflow-queue.types";

export interface NodeExecutionContext {
  payload: WorkflowJobPayload;
}

export interface NodeHandlerResult {
  output: Record<string, unknown>;
}

export abstract class BaseNodeHandler {
  /** Whether this handler runs inline (synchronously in the processor, no BullMQ job) */
  abstract get isInline(): boolean;

  /** Execute the node logic and return its output */
  abstract execute(ctx: NodeExecutionContext): Promise<NodeHandlerResult>;

  /** Optional: validate node config before execution — throw if invalid */
  validate(_ctx: NodeExecutionContext): void {
    // default: no-op
  }
}
