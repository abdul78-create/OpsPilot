'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels';

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
import { nodeTypes } from '../builder/CustomNodes';
import { NodePalette } from '../builder/NodePalette';
import { NodeInspector } from '../builder/NodeInspector';
import { ContextualAIPanel } from './ContextualAIPanel';
import { AIAutoBuilder } from '../builder/AIAutoBuilder';
import { TemplateMarketplace } from '../builder/TemplateMarketplace';
import { RepoScannerModal } from '../builder/RepoScannerModal';
import { PipelineReviewModal } from '../builder/PipelineReviewModal';
import { PresenceOverlay } from '../builder/PresenceOverlay';
import { CIConverterPanel } from '../builder/CIConverterPanel';
import { GitHubAppOnboarding } from '../builder/GitHubAppOnboarding';
import { RunnerExecutionPool } from '../builder/RunnerExecutionPool';
import { ArtifactManager } from '../builder/ArtifactManager';
import { executeCLICommand } from '../../lib/opspilot-cli';
import { autoLayoutNodes } from '../builder/AutoLayoutEngine';
import { checkBackendHealth } from '../../lib/apiClient';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { Badge } from '../ui/badge';
import {
  Play, Zap, Layers,
  Undo2, Redo2, RotateCcw, Terminal,
  SplitSquareHorizontal, GitPullRequest, FolderGit2, FileCode, GitBranch, Server, HardDrive, Command,
} from 'lucide-react';
import Link from 'next/link';

// SSR-safe xterm
const XTermPanel = dynamic(
  () => import('../ui/XTermPanel').then((m) => ({ default: m.XTermPanel })),
  { ssr: false }
);

// ─── Simulation timings ───────────────────────────────────────────────────────
const STEP_DURATIONS = [1200, 2800, 1600, 3400, 2200, 800];
const STEP_ELAPSED   = ['1.2s', '38.4s', '12.1s', '2m 18s', '14.8s', '—'];

// ─── Starter Pipeline Canvas ─────────────────────────────────────────────
const initialNodes: Node[] = [
  { id: '1', type: 'source', position: { x: 50, y: 160 }, data: { label: 'Git Source Trigger', runState: 'idle' } },
];

const initialEdges: Edge[] = [];

const TERMINAL_LINES = [
  '$ opspilot --version',
  'OpsPilot CLI v2.4.0 (Production Build)',
  '$ opspilot help',
  'Available commands:',
  '  opspilot run --pipeline <name>   Trigger pipeline execution',
  '  opspilot logs --run-id <id>      Stream live execution logs',
  '  opspilot status                  Check cluster & database status',
  '  opspilot ai analyze --run-id <id> Run AI Root Cause Analysis',
  'Ready for user command...',
];


// ─── Resize handle ─────────────────────────────────────────────────────────────
function ResizeHandle({ direction = 'vertical' }: { direction?: 'vertical' | 'horizontal' }) {
  return (
    <PanelResizeHandle className={`
      group relative bg-transparent transition-colors
      ${direction === 'vertical'
        ? 'w-1.5 hover:bg-blue-500/20 cursor-col-resize'
        : 'h-1.5 hover:bg-blue-500/20 cursor-row-resize'}
    `}>
      <div className={`
        absolute inset-0 m-auto bg-slate-700 group-hover:bg-blue-500/60 transition-colors rounded-full
        ${direction === 'vertical' ? 'w-px h-10' : 'h-px w-10'}
      `} />
    </PanelResizeHandle>
  );
}

// ─── Inner canvas ─────────────────────────────────────────────────────────────
function WorkspaceCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating]     = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [repoScannerOpen, setRepoScannerOpen] = useState(false);
  const [reviewOpen, setReviewOpen]           = useState(false);
  const [ciConverterOpen, setCiConverterOpen] = useState(false);
  const [githubAppOpen, setGithubAppOpen]     = useState(false);
  const [showInspector, setShowInspector]   = useState(true);
  const [bottomPanel, setBottomPanel]       = useState<'terminal' | 'ai' | 'workers' | 'artifacts' | 'cli'>('terminal');
  const [backendHealth, setBackendHealth]   = useState<{ isOnline: boolean; dbStatus: string }>({ isOnline: true, dbStatus: 'Up' });
  const [cliInput, setCliInput]             = useState('');
  const [cliOutput, setCliOutput]           = useState<string[]>([
    'OpsPilot CLI v2.0.0 — Type "opspilot run", "opspilot deploy", or "opspilot logs"',
  ]);
  const simRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { fitView } = useReactFlow();

  const handleCLISubmit = () => {
    if (!cliInput.trim()) return;
    const res = executeCLICommand(cliInput);
    setCliOutput((prev) => [...prev, `$ ${cliInput}`, ...res.output]);
    setCliInput('');
  };

  useEffect(() => {
    checkBackendHealth().then(setBackendHealth);
  }, []);

  const { pushSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo(
    (n) => setNodes(n),
    (e) => setEdges(e),
  );

  const handleAutoLayout = useCallback(() => {
    pushSnapshot(nodes, edges);
    const { nodes: layoutNodes, edges: layoutEdges } = autoLayoutNodes(nodes, edges);
    setNodes(layoutNodes);
    setEdges(layoutEdges);
    setTimeout(() => fitView({ duration: 400, padding: 0.2 }), 100);
  }, [nodes, edges, pushSnapshot, setNodes, setEdges, fitView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const tgt = e.target as HTMLElement;
      if (tgt?.tagName === 'INPUT' || tgt?.tagName === 'TEXTAREA' || tgt?.closest?.('.monaco-editor')) return;

      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(nodes, edges); return; }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(nodes, edges); return; }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        pushSnapshot(nodes, edges);
        setNodes((n) => n.filter((nd) => nd.id !== selectedNodeId));
        setEdges((ed) => ed.filter((eg) => eg.source !== selectedNodeId && eg.target !== selectedNodeId));
        setSelectedNodeId(null);
        return;
      }
      if (mod && e.key === 'd' && selectedNodeId) {
        e.preventDefault();
        const src = nodes.find((n) => n.id === selectedNodeId);
        if (src) {
          pushSnapshot(nodes, edges);
          const clone = { ...src, id: String(Date.now()), position: { x: src.position.x + 30, y: src.position.y + 30 }, data: { ...src.data, runState: 'idle' } };
          setNodes((n) => [...n, clone]);
          setSelectedNodeId(clone.id);
        }
        return;
      }
      const NUDGE = e.shiftKey ? 50 : 10;
      const deltas: Record<string, { x: number; y: number }> = {
        ArrowUp: { x: 0, y: -NUDGE }, ArrowDown: { x: 0, y: NUDGE },
        ArrowLeft: { x: -NUDGE, y: 0 }, ArrowRight: { x: NUDGE, y: 0 },
      };
      if (deltas[e.key] && selectedNodeId) {
        e.preventDefault();
        const d = deltas[e.key];
        setNodes((n) => n.map((nd) => nd.id === selectedNodeId ? { ...nd, position: { x: nd.position.x + d.x, y: nd.position.y + d.y } } : nd));
        return;
      }
      if (e.key === 'Escape') { setSelectedNodeId(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, edges, selectedNodeId, undo, redo, pushSnapshot, setNodes, setEdges]);

  // Live simulation
  const setNodeRunState = (id: string, runState: string, elapsed?: string) => {
    setNodes((n) => n.map((nd) => nd.id === id ? { ...nd, data: { ...nd.data, runState, elapsed } } : nd));
  };
  const resetRunStates = () => setNodes((n) => n.map((nd) => ({ ...nd, data: { ...nd.data, runState: 'idle', elapsed: undefined } })));

  const handleSimulate = () => {
    if (isSimulating) return;
    resetRunStates();
    setIsSimulating(true);
    simRef.current.forEach(clearTimeout);
    simRef.current = [];
    let accum = 0;
    nodes.forEach((nd, i) => {
      const dur = STEP_DURATIONS[i] ?? 1000;
      simRef.current.push(setTimeout(() => setNodeRunState(nd.id, 'running'), accum));
      simRef.current.push(setTimeout(() => setNodeRunState(nd.id, 'success', STEP_ELAPSED[i]), accum + dur));
      accum += dur + 250;
    });
    simRef.current.push(setTimeout(() => setIsSimulating(false), accum + 400));
  };

  const handleAddNode = useCallback((type: string, label: string) => {
    pushSnapshot(nodes, edges);
    const newNode: Node = { id: String(Date.now()), type, position: { x: 420 + Math.random() * 80, y: 160 + Math.random() * 60 }, data: { label, runState: 'idle' } };
    setNodes((n) => [...n, newNode]);
    setSelectedNodeId(newNode.id);
  }, [nodes, edges, pushSnapshot, setNodes]);

  const handleAIGenerate = useCallback(({ nodes: n, edges: e }: { nodes: Node[]; edges: Edge[] }) => {
    pushSnapshot(nodes, edges);
    setNodes(n);
    setEdges(e);
    setTimeout(() => fitView({ duration: 500, padding: 0.2 }), 100);
  }, [nodes, edges, pushSnapshot, setNodes, setEdges, fitView]);

  const onConnect = useCallback((params: Connection) => {
    pushSnapshot(nodes, edges);
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#38bdf8', strokeWidth: 2 } }, eds));
  }, [nodes, edges, pushSnapshot, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setShowInspector(true);
  }, []);

  const handleUpdateNodeData = useCallback((id: string, data: Record<string, unknown>) => {
    setNodes((n) => n.map((nd) => nd.id === id ? { ...nd, data: { ...nd.data, ...data } } : nd));
  }, [setNodes]);

  const handleDeleteNode = useCallback((id: string) => {
    pushSnapshot(nodes, edges);
    setNodes((n) => n.filter((nd) => nd.id !== id));
    setEdges((e) => e.filter((eg) => eg.source !== id && eg.target !== id));
    setSelectedNodeId(null);
  }, [nodes, edges, pushSnapshot, setNodes, setEdges]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      {/* ── TOPBAR ── */}
      <header className="h-12 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-900 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
            <Link href="/" className="hover:text-slate-200 transition-colors">OpsPilot</Link>
            <span>/</span>
            <span className="text-slate-400">production-workspace</span>

            <span>/</span>
            <span className="text-slate-300 font-semibold">backend-api</span>
          </div>
          <Badge status="healthy">v31 · Ready</Badge>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Backend v1: {backendHealth.isOnline ? 'Connected' : 'Offline'} (DB: {backendHealth.dbStatus})
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => undo(nodes, edges)} disabled={!canUndo} title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 transition-colors">
            <Undo2 size={13} />
          </button>
          <button onClick={() => redo(nodes, edges)} disabled={!canRedo} title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 transition-colors">
            <Redo2 size={13} />
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          <button onClick={() => setGithubAppOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-900/20 border border-emerald-700/40 hover:bg-emerald-900/40 transition-colors">
            <GitBranch size={12} /> GitHub App
          </button>
          <button onClick={() => setRepoScannerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-300 bg-blue-900/20 border border-blue-700/40 hover:bg-blue-900/40 transition-colors">
            <FolderGit2 size={12} /> Import Repo
          </button>
          <button onClick={() => setCiConverterOpen(!ciConverterOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
              ciConverterOpen ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}>
            <FileCode size={12} /> Convert CI
          </button>
          <button onClick={() => setReviewOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition-colors">
            <GitPullRequest size={12} /> PR Review
          </button>
          <button onClick={() => setMarketplaceOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition-colors">
            <Layers size={12} /> Templates
          </button>
          <button onClick={handleAutoLayout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-blue-300 hover:bg-slate-800 transition-colors" title="Auto-layout canvas nodes in swimlanes">
            <Zap size={12} /> Auto-Layout
          </button>
          <button onClick={resetRunStates}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors" title="Reset simulation">
            <RotateCcw size={13} />
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 disabled:opacity-60 transition-colors"
          >
            <Play size={12} />
            {isSimulating ? 'Running…' : 'Simulate Run'}
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          {/* Multiplayer Presence & Inline Comments */}
          <PresenceOverlay />
        </div>
      </header>

      {/* ── MAIN PANELS ── */}
      <PanelGroup orientation="vertical" className="flex-1 min-h-0">

        {/* TOP ROW: Palette | Canvas | Inspector+AI */}
        <Panel defaultSize={68} minSize={45}>
          <PanelGroup orientation="horizontal" className="h-full">

            {/* LEFT: Node Palette or CI Converter Panel */}
            {ciConverterOpen ? (
              <Panel defaultSize={30} minSize={20} maxSize={45}>
                <CIConverterPanel
                  onImportPipeline={(newNodes, newEdges) => {
                    pushSnapshot(nodes, edges);
                    setNodes(newNodes);
                    setEdges(newEdges);
                    setCiConverterOpen(false);
                    setTimeout(() => fitView({ duration: 500, padding: 0.2 }), 100);
                  }}
                  onClose={() => setCiConverterOpen(false)}
                />
              </Panel>
            ) : (
              <Panel defaultSize={14} minSize={10} maxSize={22}>
                <div className="h-full border-r border-slate-800 overflow-hidden">
                  <NodePalette onAddNode={handleAddNode} />
                </div>
              </Panel>
            )}

            <ResizeHandle direction="vertical" />

            {/* CENTER: React Flow Canvas */}
            <Panel defaultSize={57} minSize={35}>
              <div className="h-full relative bg-slate-950">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={onNodeClick}
                  onPaneClick={() => setSelectedNodeId(null)}
                  nodeTypes={nodeTypes}
                  fitView
                  className="bg-slate-950"
                >
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
                  <Controls className="!bg-slate-900 !border-slate-800 !rounded-lg !shadow-none" />
                  <MiniMap className="!bg-slate-900 !border-slate-800 !rounded-lg !shadow-none" nodeColor="#475569" />
                </ReactFlow>
                {/* AI Auto Builder */}
                <AIAutoBuilder onGenerate={handleAIGenerate} />
              </div>
            </Panel>

            <ResizeHandle direction="vertical" />

            {/* RIGHT: Inspector tabs (Inspector | AI) */}
            <Panel defaultSize={29} minSize={20} maxSize={38}>
              <div className="h-full flex flex-col border-l border-slate-800 overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-slate-800 bg-slate-900 shrink-0">
                  <button
                    onClick={() => setShowInspector(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      showInspector ? 'text-slate-200 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <SplitSquareHorizontal size={11} /> Inspector
                  </button>
                  <button
                    onClick={() => setShowInspector(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      !showInspector ? 'text-blue-300 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Sparkles size={11} /> AI
                  </button>
                </div>

                {/* Panel content */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  {showInspector ? (
                    <NodeInspector
                      selectedNode={selectedNode}
                      onUpdateNodeData={handleUpdateNodeData}
                      onDeleteNode={handleDeleteNode}
                      onClose={() => setSelectedNodeId(null)}
                    />
                  ) : (
                    <ContextualAIPanel selectedNode={selectedNode} />
                  )}
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        <ResizeHandle direction="horizontal" />

        {/* BOTTOM ROW: xterm Terminal | AI Copilot chat */}
        <Panel defaultSize={32} minSize={18}>
          <PanelGroup orientation="horizontal" className="h-full">

            {/* BOTTOM-LEFT: xterm.js terminal */}
            <Panel defaultSize={62} minSize={30}>
              <div className="h-full flex flex-col border-t border-r border-slate-800">
                <div className="h-8 px-3 flex items-center gap-2 bg-slate-900 border-b border-slate-800 shrink-0">
                  <button
                    onClick={() => setBottomPanel('terminal')}
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                      bottomPanel === 'terminal' ? 'text-slate-200 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Terminal size={10} /> Live Terminal
                  </button>
                  <button
                    onClick={() => setBottomPanel('workers')}
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                      bottomPanel === 'workers' ? 'text-blue-300 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Server size={10} /> Worker Pool
                  </button>
                  <button
                    onClick={() => setBottomPanel('artifacts')}
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                      bottomPanel === 'artifacts' ? 'text-emerald-300 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <HardDrive size={10} /> Artifacts
                  </button>
                  <button
                    onClick={() => setBottomPanel('cli')}
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                      bottomPanel === 'cli' ? 'text-purple-300 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Command size={10} /> CLI Terminal
                  </button>
                  <span className="ml-auto text-[10px] font-mono text-slate-600">Run #48 · 3m 06s</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto bg-[#020617] p-2">
                  {bottomPanel === 'terminal' && <XTermPanel key="workspace-terminal" lines={TERMINAL_LINES} stream={true} />}
                  {bottomPanel === 'workers' && <RunnerExecutionPool />}
                  {bottomPanel === 'artifacts' && <ArtifactManager />}
                  {bottomPanel === 'cli' && (
                    <div className="flex flex-col h-full font-mono text-xs text-slate-300 p-2 space-y-2">
                      <div className="flex-1 overflow-y-auto space-y-1">
                        {cliOutput.map((out, i) => (
                          <div key={i} className={out.startsWith('$') ? 'text-blue-400 font-bold' : out.startsWith('✓') ? 'text-emerald-400' : 'text-slate-400'}>
                            {out}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 border-t border-slate-800 pt-2 shrink-0">
                        <span className="text-blue-400 font-bold">$</span>
                        <input
                          type="text"
                          value={cliInput}
                          onChange={(e) => setCliInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCLISubmit()}
                          placeholder="opspilot run | opspilot deploy | opspilot logs"
                          className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Panel>

            <ResizeHandle direction="vertical" />

            {/* BOTTOM-RIGHT: Contextual AI panel (always visible) */}
            <Panel defaultSize={38} minSize={22}>
              <div className="h-full border-t border-slate-800 overflow-hidden">
                <ContextualAIPanel selectedNode={selectedNode} />
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {/* Modals */}
      <TemplateMarketplace
        open={marketplaceOpen}
        onClose={() => setMarketplaceOpen(false)}
        onSelectTemplate={() => setMarketplaceOpen(false)}
      />
      <GitHubAppOnboarding
        open={githubAppOpen}
        onClose={() => setGithubAppOpen(false)}
        onSelectRepo={() => {
          setGithubAppOpen(false);
          handleAutoLayout();
        }}
      />
      <RepoScannerModal
        open={repoScannerOpen}
        onClose={() => setRepoScannerOpen(false)}
        onImportComplete={() => setRepoScannerOpen(false)}
      />
      <PipelineReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
}

// Wrapper with ReactFlow context
export function UnifiedWorkspace() {
  return (
    <ReactFlowProvider>
      <WorkspaceCanvas />
    </ReactFlowProvider>
  );
}

// Lucide icon used inline
function Sparkles({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
