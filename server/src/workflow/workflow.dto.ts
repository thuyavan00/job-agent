import { NodeSubtype, NodeType } from "./entities/workflow-node.entity";
import { RunTrigger } from "./entities/workflow-run.entity";
import { WorkflowMode } from "./entities/workflow.entity";
import { EdgeCondition } from "./entities/workflow-edge.entity";

// ── Workflow ──────────────────────────────────────────────────────────────────

export class CreateWorkflowDto {
  name: string;
  mode?: WorkflowMode;
}

export class UpdateWorkflowDto {
  name?: string;
  mode?: WorkflowMode;
}

// ── Node ──────────────────────────────────────────────────────────────────────

export class CreateNodeDto {
  label: string;
  type: NodeType;
  subtype: NodeSubtype;
  positionX?: number;
  positionY?: number;
  config?: Record<string, unknown>;
}

export class UpdateNodeDto {
  label?: string;
  positionX?: number;
  positionY?: number;
  config?: Record<string, unknown>;
}

// ── Edge ──────────────────────────────────────────────────────────────────────

export class CreateEdgeDto {
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  condition?: EdgeCondition;
}

// ── Save entire graph (used by React Flow "Save" button) ──────────────────────

export class NodeSnapshot {
  /** Existing node id (omit for new nodes) */
  id?: string;
  label: string;
  type: NodeType;
  subtype: NodeSubtype;
  positionX: number;
  positionY: number;
  config?: Record<string, unknown>;
}

export class EdgeSnapshot {
  /** Existing edge id (omit for new edges) */
  id?: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  condition?: EdgeCondition;
}

export class SaveWorkflowGraphDto {
  nodes: NodeSnapshot[];
  edges: EdgeSnapshot[];
}

// ── Run ───────────────────────────────────────────────────────────────────────

export class TriggerRunDto {
  triggeredBy?: RunTrigger;
}
