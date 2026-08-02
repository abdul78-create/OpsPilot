'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DeveloperShell } from '../layout/DeveloperShell';
import { NodePalette } from './NodePalette';
import { NodeInspector } from './NodeInspector';
import { nodeTypes } from './CustomNodes';
import { TemplateMarketplace } from './TemplateMarketplace';
import { PipelineGitHistory } from './PipelineGitHistory';
import { PublicShareModal } from './PublicShareModal';
import { AICopilotOverlay } from './AICopilotOverlay';
import { AIAutoBuilder } from './AIAutoBuilder';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Play, Pause, Save, Zap, Sliders, History,
  Share2, Layers, Undo2, Redo2, RotateCcw,
} from 'lucide-react';

// ─── Simulation step durations (ms) ──────────────────────────────────────────
const STEP_DURATIONS = [1200, 2800, 1600, 3400, 2200, 800];
const STEP_ELAPSED   = ['1.2s', '38.4s', '12.1s', '2m 18s', '14.8s', '—'];

// ─── Initial pipeline ─────────────────────────────────────────────────────────
const initialNodes: Node[] = [
  { id: '1', type: 'source',   position: { x: 50,   y: 170 }, data: { label: 'Git Source',              repo: 'acme-corp/backend-api:main', runState: 'idle' } },
  { id: '2', type: 'build',    position: { x: 320,  y: 170 }, data: { label: 'Docker Container Build',  image: 'node:20-alpine',            runState: 'idle' } },
  { id: '3', type: 'security', position: { x: 590,  y: 80  }, data: { label: 'Trivy SAST Scan',                                             runState: 'idle' } },
  { id: '4', type: 'test',     position: { x: 590,  y: 260 }, data: { label: 'Jest Integration Tests',  command: 'npm test',                runState: 'idle' } },
  { id: '5', type: 'deploy',   position: { x: 860,  y: 170 }, data: { label: 'Kubernetes Cluster',      target: 'prod-us-east-1',           runState: 'idle' } },
  { id: '6', type: 'notification', position: { x: 1130, y: 170 }, data: { label: 'Slack Webhook',                                          runState: 'idle' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } },
  { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } },
  { id: 'e3-5', source: '3', target: '5', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } },
  { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } },
];

// ─── Inner canvas (needs ReactFlowProvider context) ───────────────────────────
function BuilderCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen]   = useState(true);
  const [isSimulating, setIsSimulating]     = useState(false);
  const simRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Modals
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [historyOpen, setHistoryOpen]         = useState(false);
  const [shareOpen, setShareOpen]             = useState(false);

  const { fitView } = useReactFlow();

  // ── Undo/Redo ───────────────────────────────────────────────────────────────
  const { pushSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo(
    (n) => setNodes(n),
    (e) => setEdges(e),
  );

  // Global keyboard shortcuts — Figma-grade canvas UX
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      // Don't intercept when user is typing in Monaco, input, or textarea
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.closest?.('.monaco-editor')) return;

      // Undo / Redo
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(nodes, edges); return; }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(nodes, edges); return; }

      // Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        pushSnapshot(nodes, edges);
        setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
        setEdges((eds) => eds.filter((ed) => ed.source !== selectedNodeId && ed.target !== selectedNodeId));
        setSelectedNodeId(null);
        return;
      }

      // Duplicate selected node — Ctrl+D
      if (mod && e.key === 'd' && selectedNodeId) {
        e.preventDefault();
        const src = nodes.find((n) => n.id === selectedNodeId);
        if (src) {
          pushSnapshot(nodes, edges);
          const clone = {
            ...src,
            id: String(Date.now()),
            position: { x: src.position.x + 30, y: src.position.y + 30 },
            data: { ...src.data, runState: 'idle', elapsed: undefined },
          };
          setNodes((nds) => [...nds, clone]);
          setSelectedNodeId(clone.id);
        }
        return;
      }

      // Arrow key nudge (Shift = 50px, default = 10px)
      const NUDGE = e.shiftKey ? 50 : 10;
      const deltas: Record<string, { x: number; y: number }> = {
        ArrowUp: { x: 0, y: -NUDGE }, ArrowDown: { x: 0, y: NUDGE },
        ArrowLeft: { x: -NUDGE, y: 0 }, ArrowRight: { x: NUDGE, y: 0 },
      };
      if (deltas[e.key] && selectedNodeId) {
        e.preventDefault();
        const d = deltas[e.key];
        setNodes((nds) => nds.map((n) =>
          n.id === selectedNodeId
            ? { ...n, position: { x: n.position.x + d.x, y: n.position.y + d.y } }
            : n
        ));
        return;
      }

      // Escape — deselect & close inspector
      if (e.key === 'Escape') { setSelectedNodeId(null); setInspectorOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, edges, selectedNodeId, undo, redo, pushSnapshot, setNodes, setEdges]);


  // ── Helpers ─────────────────────────────────────────────────────────────────
  const setNodeRunState = (id: string, runState: string, elapsed?: string) => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, runState, elapsed } } : n)
    );
  };

  const resetAllRunStates = () => {
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runState: 'idle', elapsed: undefined } })));
  };

  // ── Live simulation state machine ────────────────────────────────────────────
  const handleSimulateRun = () => {
    if (isSimulating) return;
    resetAllRunStates();
    setIsSimulating(true);
    simRef.current.forEach(clearTimeout);
    simRef.current = [];

    const nodeIds = nodes.map((n) => n.id);
    let accum = 0;

    nodeIds.forEach((id, i) => {
      const startDelay = accum;
      const dur = STEP_DURATIONS[i] ?? 1000;

      // queued → running
      simRef.current.push(setTimeout(() => setNodeRunState(id, 'running'), startDelay));
      // running → success
      simRef.current.push(setTimeout(() => setNodeRunState(id, 'success', STEP_ELAPSED[i]), startDelay + dur));
      accum += dur + 300;
    });

    // All done
    simRef.current.push(setTimeout(() => setIsSimulating(false), accum + 500));
  };

  // ── Add node (with undo snapshot) ───────────────────────────────────────────
  const handleAddNode = useCallback((type: string, label: string) => {
    pushSnapshot(nodes, edges);
    const newNode: Node = {
      id: String(Date.now()),
      type,
      position: { x: 400 + Math.random() * 120, y: 160 + Math.random() * 80 },
      data: { label, runState: 'idle' },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newNode.id);
  }, [nodes, edges, pushSnapshot, setNodes]);

  // ── AI Auto Builder ─────────────────────────────────────────────────────────
  const handleAIGenerate = useCallback(({ nodes: newNodes, edges: newEdges }: { nodes: Node[]; edges: Edge[] }) => {
    pushSnapshot(nodes, edges);
    setNodes(newNodes);
    setEdges(newEdges);
    // Animate fit after nodes render
    setTimeout(() => fitView({ duration: 600, padding: 0.2 }), 100);
  }, [nodes, edges, pushSnapshot, setNodes, setEdges, fitView]);

  // ── Connect ─────────────────────────────────────────────────────────────────
  const onConnect = useCallback((params: Connection) => {
    pushSnapshot(nodes, edges);
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#38bdf8', strokeWidth: 2 } }, eds));
  }, [nodes, edges, pushSnapshot, setEdges]);

  // ── Node interactions ───────────────────────────────────────────────────────
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setInspectorOpen(true);
  }, []);

  const handleUpdateNodeData = useCallback((id: string, updatedData: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...updatedData } } : n));
  }, [setNodes]);

  const handleDeleteNode = useCallback((id: string) => {
    pushSnapshot(nodes, edges);
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  }, [nodes, edges, pushSnapshot, setNodes, setEdges]);

  // ── Template loader ─────────────────────────────────────────────────────────
  const handleSelectTemplate = (templateId: string) => {
    pushSnapshot(nodes, edges);
    const makeSrc = (id: string, type: string, label: string, extra: Record<string, unknown>, x: number, y: number): Node => ({
      id, type, position: { x, y }, data: { label, runState: 'idle', ...extra },
    });
    const makeEdge = (src: string, tgt: string): Edge => ({
      id: `e-${src}-${tgt}`, source: src, target: tgt, animated: true, style: { stroke: '#64748b', strokeWidth: 2 },
    });

    if (templateId === 'go-api-service') {
      const n = [
        makeSrc('1','source','Git Source',   { repo: 'acme/go-api:main' },        50,  170),
        makeSrc('2','test',  'Go Test & Vet',{ command: 'go test ./...' },         320, 170),
        makeSrc('3','build', 'Scratch Container',{ image: 'scratch:latest' },       590, 170),
        makeSrc('4','deploy','Helm K8s Rollout',{ target: 'prod-cluster' },         860, 170),
      ];
      setNodes(n);
      setEdges([makeEdge('1','2'), makeEdge('2','3'), makeEdge('3','4')]);
    } else if (templateId === 'nextjs-fullstack') {
      const n = [
        makeSrc('1','source',  'Git Source',        { repo: 'acme/frontend:main' },     50,  170),
        makeSrc('2','test',    'ESLint + Jest',      { command: 'npm run lint && npm test' }, 320, 170),
        makeSrc('3','security','Trivy SAST Scan',    {},                                590, 80),
        makeSrc('4','build',   'Docker Build',       { image: 'node:20-alpine' },        590, 260),
        makeSrc('5','deploy',  'Vercel Edge Deploy', { target: 'production' },           860, 170),
        makeSrc('6','notification','Slack Notify',   {},                                1130, 170),
      ];
      setNodes(n);
      setEdges([makeEdge('1','2'), makeEdge('2','3'), makeEdge('2','4'), makeEdge('3','5'), makeEdge('4','5'), makeEdge('5','6')]);
    }

    setTimeout(() => fitView({ duration: 600, padding: 0.2 }), 100);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3 relative">
        {/* AI Copilot banner */}
        <AICopilotOverlay onAutoAddStep={(type, label) => handleAddNode(type, label)} />

        {/* TOP TOOLBAR */}
        <div className="h-14 px-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-slate-100 tracking-tight">Visual Pipeline Builder</h1>
            <Badge status="healthy">v31 • Ready</Badge>
            <span className="text-xs font-mono text-slate-400">acme-corp/backend-api</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Undo / Redo */}
            <Button variant="ghost" size="sm" onClick={() => undo(nodes, edges)} disabled={!canUndo} title="Undo (Ctrl+Z)" className="gap-1">
              <Undo2 size={13} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => redo(nodes, edges)} disabled={!canRedo} title="Redo (Ctrl+Y)" className="gap-1">
              <Redo2 size={13} />
            </Button>

            <div className="h-4 w-px bg-slate-800 mx-0.5" />

            <Button onClick={() => setMarketplaceOpen(true)} variant="secondary" size="sm" className="gap-1.5">
              <Layers size={13} /><span>Templates</span>
            </Button>
            <Button onClick={() => setHistoryOpen(true)} variant="secondary" size="sm" className="gap-1.5">
              <History size={13} /><span>History</span>
            </Button>
            <Button onClick={() => setShareOpen(true)} variant="secondary" size="sm" className="gap-1.5">
              <Share2 size={13} /><span>Share</span>
            </Button>

            <div className="h-4 w-px bg-slate-800 mx-0.5" />

            <Button onClick={resetAllRunStates} variant="ghost" size="sm" title="Reset simulation" className="gap-1">
              <RotateCcw size={13} />
            </Button>
            <Button onClick={handleSimulateRun} isLoading={isSimulating} variant="primary" size="sm" className="gap-1.5">
              <Play size={13} /><span>{isSimulating ? 'Running…' : 'Simulate Run'}</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fitView({ duration: 500 })} className="gap-1.5">
              <Zap size={13} /><span>Fit View</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInspectorOpen(!inspectorOpen)} className="gap-1.5">
              <Sliders size={13} /><span>Inspector</span>
            </Button>
          </div>
        </div>

        {/* WORKSPACE */}
        <div className="flex-1 flex min-h-0 rounded-xl border border-slate-800 overflow-hidden bg-slate-950 relative">
          <NodePalette onAddNode={handleAddNode} />

          {/* CANVAS */}
          <div className="flex-1 h-full relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-slate-950"
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
              <Controls className="!bg-slate-900 !border-slate-800 !text-slate-200 !rounded-lg !shadow-none" />
              <MiniMap className="!bg-slate-900 !border-slate-800 !rounded-lg !shadow-none" nodeColor="#475569" />
            </ReactFlow>

            {/* AI Auto Builder — floating bottom bar */}
            <AIAutoBuilder onGenerate={handleAIGenerate} />
          </div>

          {/* RIGHT INSPECTOR */}
          {inspectorOpen && (
            <NodeInspector
              selectedNode={selectedNode}
              onUpdateNodeData={handleUpdateNodeData}
              onDeleteNode={handleDeleteNode}
              onClose={() => setInspectorOpen(false)}
            />
          )}
        </div>

        {/* MODALS */}
        <TemplateMarketplace open={marketplaceOpen} onClose={() => setMarketplaceOpen(false)} onSelectTemplate={handleSelectTemplate} />
        <PipelineGitHistory  open={historyOpen}     onClose={() => setHistoryOpen(false)}   onRestoreVersion={() => {}} />
        <PublicShareModal     open={shareOpen}       onClose={() => setShareOpen(false)}      onForkPipeline={() => {}} />
      </div>
    </DeveloperShell>
  );
}

// ─── Exported wrapper (provides ReactFlow context) ────────────────────────────
export function PipelineBuilder() {
  return (
    <ReactFlowProvider>
      <BuilderCanvas />
    </ReactFlowProvider>
  );
}
