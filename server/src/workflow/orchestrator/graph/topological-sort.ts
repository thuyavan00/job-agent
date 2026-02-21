import type { WorkflowNode } from "../../entities/workflow-node.entity";
import type { WorkflowEdge } from "../../entities/workflow-edge.entity";

export interface TopologicalSortResult {
  sorted: WorkflowNode[];
  /** IDs of nodes that could not be sorted — indicates a cycle */
  cycleNodes: string[];
}

/**
 * Kahn's algorithm — O(V+E).
 * Returns nodes in topological order.
 * If a cycle exists, cycleNodes will be non-empty.
 */
export function topologicalSort(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): TopologicalSortResult {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const adjacency = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const edge of edges) {
    const srcId = typeof edge.source === "string" ? edge.source : (edge.source as WorkflowNode).id;
    const tgtId = typeof edge.target === "string" ? edge.target : (edge.target as WorkflowNode).id;
    adjacency.get(srcId)?.push(tgtId);
    inDegree.set(tgtId, (inDegree.get(tgtId) ?? 0) + 1);
  }

  // Start with all zero-in-degree nodes
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: WorkflowNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);

    for (const neighborId of adjacency.get(id) ?? []) {
      const newDeg = (inDegree.get(neighborId) ?? 0) - 1;
      inDegree.set(neighborId, newDeg);
      if (newDeg === 0) queue.push(neighborId);
    }
  }

  // Any node not in sorted has a cycle dependency
  const sortedIds = new Set(sorted.map((n) => n.id));
  const cycleNodes = nodes.filter((n) => !sortedIds.has(n.id)).map((n) => n.id);

  return { sorted, cycleNodes };
}
