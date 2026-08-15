import { useCallback, useRef, useState } from 'react';
import { Node, Edge } from '@xyflow/react';

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

export function useUndoRedo(
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = () => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  };

  /** Call this BEFORE any mutation to record the current state */
  const pushSnapshot = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    past.current = [...past.current.slice(-MAX_HISTORY + 1), { nodes: currentNodes, edges: currentEdges }];
    future.current = [];
    syncFlags();
  }, []);

  const undo = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (past.current.length === 0) return;
    const prev = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    future.current = [{ nodes: currentNodes, edges: currentEdges }, ...future.current];
    setNodes(prev.nodes);
    setEdges(prev.edges);
    syncFlags();
  }, [setNodes, setEdges]);

  const redo = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (future.current.length === 0) return;
    const next = future.current[0];
    future.current = future.current.slice(1);
    past.current = [...past.current, { nodes: currentNodes, edges: currentEdges }];
    setNodes(next.nodes);
    setEdges(next.edges);
    syncFlags();
  }, [setNodes, setEdges]);

  return { pushSnapshot, undo, redo, canUndo, canRedo };
}
