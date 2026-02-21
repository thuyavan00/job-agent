import { NodeType } from "../../entities/workflow-node.entity";
import type { WorkflowNode } from "../../entities/workflow-node.entity";
import type { WorkflowEdge } from "../../entities/workflow-edge.entity";
import { topologicalSort } from "./topological-sort";

export interface GraphValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a workflow graph before execution.
 * Checks: has nodes, has trigger nodes, no dangling edge references, no cycles.
 */
export function validateWorkflowGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): GraphValidationResult {
  const errors: string[] = [];

  if (nodes.length === 0) {
    errors.push("Workflow has no nodes");
    return { valid: false, errors };
  }

  const triggerNodes = nodes.filter((n) => n.type === NodeType.TRIGGER);
  if (triggerNodes.length === 0) {
    errors.push("Workflow has no trigger nodes — add at least one trigger");
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    const srcId = typeof edge.source === "string" ? edge.source : (edge.source as WorkflowNode).id;
    const tgtId = typeof edge.target === "string" ? edge.target : (edge.target as WorkflowNode).id;
    if (!nodeIds.has(srcId)) {
      errors.push(`Edge references unknown source node: ${srcId}`);
    }
    if (!nodeIds.has(tgtId)) {
      errors.push(`Edge references unknown target node: ${tgtId}`);
    }
  }

  const { cycleNodes } = topologicalSort(nodes, edges);
  if (cycleNodes.length > 0) {
    errors.push(`Workflow contains a cycle involving nodes: ${cycleNodes.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
