import { Node, Edge } from '@xyflow/react';

/**
 * Organizes React Flow nodes in clean parallel swimlanes based on pipeline execution order.
 */
export function autoLayoutNodes(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));
  const typeOrder: Record<string, number> = {
    source: 0,
    build: 1,
    test: 2,
    security: 2,
    deploy: 3,
    notification: 4,
  };

  // Group nodes by step rank
  const ranks: Map<number, Node[]> = new Map();
  nodes.forEach((node) => {
    const rank = typeOrder[node.type ?? 'test'] ?? 2;
    if (!ranks.has(rank)) ranks.set(rank, []);
    ranks.get(rank)!.push(node);
  });

  const X_SPACING = 280;
  const Y_SPACING = 140;

  const layoutNodes = nodes.map((node) => {
    const rank = typeOrder[node.type ?? 'test'] ?? 2;
    const rankNodes = ranks.get(rank) ?? [node];
    const indexInRank = rankNodes.indexOf(node);
    
    // Offset vertically if multiple nodes are in the same rank (e.g. Test + Security running in parallel)
    const yOffset = (indexInRank - (rankNodes.length - 1) / 2) * Y_SPACING;

    return {
      ...node,
      position: {
        x: 60 + rank * X_SPACING,
        y: 180 + yOffset,
      },
    };
  });

  // Ensure edges are styled consistently
  const styledEdges = edges.map((e) => ({
    ...e,
    animated: true,
    style: { stroke: '#38bdf8', strokeWidth: 2 },
  }));

  return { nodes: layoutNodes, edges: styledEdges };
}
