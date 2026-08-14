'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import { validateDAG, dagToYaml, DAGValidationResult } from './DAGCompiler';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/Toast';
import {
  createPipelineDefinition,
  triggerPipeline,
  DEFAULT_PROJECT_ID,
  DEFAULT_PIPELINE_ID,
} from '../../lib/apiClient';
import {
  Play, Save, Zap, Sliders, History,
  Share2, Layers, Undo2, Redo2, RotateCcw,
  FileCode, CheckCircle2, AlertTriangle, XCircle,
  Sparkles, Check, ArrowRight
} from 'lucide-react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// ─── Simulation step durations (ms) ──────────────────────────────────────────
const STEP_DURATIONS = [1000, 2400, 1500, 1800, 1200, 2000, 1200, 1000, 800];
const STEP_ELAPSED   = ['1.0s', '34.2s', '11.8s', '8.4s', 'Approved', '1m 12s', '200 OK', 'Standby', 'Sent'];

// ─── Initial full-lifecycle pipeline ─────────────────────────────────────────
const initialNodes: Node[] = [
  { id: '1', type: 'source',       position: { x: 40,   y: 180 }, data: { label: 'GitHub Trigger',    repo: 'opspilot/production-backend:main', runState: 'idle' } },
  { id: '2', type: 'build',        position: { x: 320,  y: 180 }, data: { label: 'Docker Build',      image: 'node:20-alpine',                  runState: 'idle' } },
  { id: '3', type: 'test',         position: { x: 600,  y: 80  }, data: { label: 'Jest Test Suite',   command: 'npm test -- --ci',              runState: 'idle' } },
  { id: '4', type: 'security',     position: { x: 600,  y: 280 }, data: { label: 'Trivy SAST Audit',                                            runState: 'idle' } },
  { id: '5', type: 'approval',     position: { x: 880,  y: 180 }, data: { label: 'Production Gate',   approvers: 'Role: ADMIN required',        runState: 'idle' } },
  { id: '6', type: 'deploy',       position: { x: 1160, y: 180 }, data: { label: 'Cluster Rollout',   target: 'prod-us-east-1',                 runState: 'idle' } },
  { id: '7', type: 'health',       position: { x: 1440, y: 180 }, data: { label: 'Health Probe',      endpoint: 'GET /v1/health : 200',         runState: 'idle' } },
  { id: '8', type: 'notification', position: { x: 1720, y: 180 }, data: { label: 'Slack Alert',                                                runState: 'idle' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#8B5CF6', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 } },
  { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 } },
  { id: 'e3-5', source: '3', target: '5', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
  { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: '#EAB308', strokeWidth: 2 } },
  { id: 'e6-7', source: '6', target: '7', animated: true, style: { stroke: '#A855F7', strokeWidth: 2 } },
  { id: 'e7-8', source: '7', target: '8', animated: true, style: { stroke: '#14B8A6', strokeWidth: 2 } },
];

// ─── Inner canvas (needs ReactFlowProvider context) ───────────────────────────
function BuilderCanvas() {
  const router = useRouter();
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen]   = useState(true);
  const [isSimulating, setIsSimulating]     = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [isTriggering, setIsTriggering]     = useState(false);
  const simRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Modals
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [historyOpen, setHistoryOpen]         = useState(false);
  const [shareOpen, setShareOpen]             = useState(false);
  const [yamlModalOpen, setYamlModalOpen]     = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [generatedYaml, setGeneratedYaml]     = useState('');

  const { fitView } = useReactFlow();

  // ── Real-time DAG Validation ───────────────────────────────────────────────
  const validation: DAGValidationResult = validateDAG(nodes, edges);

  // ── Undo/Redo ───────────────────────────────────────────────────────────────
  const { pushSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo(
    (n) => setNodes(n),
    (e) => setEdges(e),
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.closest?.('.monaco-editor')) return;

      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(nodes, edges); return; }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(nodes, edges); return; }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        pushSnapshot(nodes, edges);
        setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
        setEdges((eds) => eds.filter((ed) => ed.source !== selectedNodeId && ed.target !== selectedNodeId));
        setSelectedNodeId(null);
        return;
      }

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

  // ── Live simulation ────────────────────────────────────────────────────────
  const handleSimulateRun = () => {
    if (isSimulating) return;
    resetAllRunStates();
    setIsSimulating(true);
    simRef.current.forEach(clearTimeout);
    simRef.current = [];

    const order = validation.executionOrder.length > 0 ? validation.executionOrder : nodes.map((n) => n.id);
    let accum = 0;

    order.forEach((id, i) => {
      const startDelay = accum;
      const dur = STEP_DURATIONS[i % STEP_DURATIONS.length] ?? 1200;

      simRef.current.push(setTimeout(() => setNodeRunState(id, 'running'), startDelay));
      simRef.current.push(setTimeout(() => setNodeRunState(id, 'success', STEP_ELAPSED[i % STEP_ELAPSED.length]), startDelay + dur));
      accum += dur + 250;
    });

    simRef.current.push(setTimeout(() => {
      setIsSimulating(false);
      toast({ kind: 'success', title: 'Simulation Complete', message: 'All pipeline stages validated successfully.' });
    }, accum + 400));
  };

  // ── View & Export YAML ──────────────────────────────────────────────────────
  const handleOpenYaml = () => {
    const yaml = dagToYaml(nodes, edges, 'OpsPilot Production Pipeline', 'main');
    setGeneratedYaml(yaml);
    setYamlModalOpen(true);
  };

  // ── Save Pipeline to Backend ───────────────────────────────────────────────
  const handleSavePipeline = async () => {
    if (!validation.valid) {
      toast({ kind: 'error', title: 'DAG Validation Error', message: validation.errors[0] });
      setValidationModalOpen(true);
      return;
    }

    setIsSaving(true);
    const yaml = dagToYaml(nodes, edges, 'OpsPilot Visual Pipeline', 'main');

    try {
      const res = await createPipelineDefinition(DEFAULT_PROJECT_ID, {
        name: `Visual Pipeline ${Date.now().toString().slice(-4)}`,
        yamlConfig: yaml,
        triggerBranch: 'main',
        description: 'Compiled from Visual DAG Builder',
      });

      if (res?.data) {
        toast({
          kind: 'success',
          title: 'Pipeline Saved Successfully',
          message: `Version v${res.data.currentVersionNumber || 1} compiled to NestJS backend.`,
        });
      } else {
        toast({ kind: 'info', title: 'Pipeline YAML Compiled', message: 'Ready to deploy to runner.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving pipeline.';
      toast({ kind: 'warning', title: 'Pipeline Compiled Locally', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Real Trigger Run & Navigate ────────────────────────────────────────────
  const handleRealTrigger = async () => {
    if (!validation.valid) {
      toast({ kind: 'error', title: 'DAG Validation Error', message: validation.errors[0] });
      return;
    }

    setIsTriggering(true);
    toast({ kind: 'info', title: 'Triggering Pipeline Run...', message: 'Connecting to Docker runner.' });

    try {
      const res = await triggerPipeline(DEFAULT_PIPELINE_ID, 'main');
      if (res?.data?.id) {
        toast({
          kind: 'success',
          title: 'Live Run Initiated',
          message: `Run ID: ${res.data.id.slice(0, 8)} · Streaming terminal ready.`,
        });
        router.push(`/runs/${res.data.id}`);
      } else {
        toast({ kind: 'error', title: 'Trigger Failed', message: 'No run ID returned.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to trigger run.';
      toast({ kind: 'error', title: 'Trigger Error', message: msg });
    } finally {
      setIsTriggering(false);
    }
  };

  // ── Add node ───────────────────────────────────────────────────────────────
  const handleAddNode = useCallback((type: string, label: string) => {
    pushSnapshot(nodes, edges);
    const newNode: Node = {
      id: String(Date.now()),
      type,
      position: { x: 450 + Math.random() * 100, y: 160 + Math.random() * 80 },
      data: { label, runState: 'idle' },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newNode.id);
  }, [nodes, edges, pushSnapshot, setNodes]);

  // ── Connect ─────────────────────────────────────────────────────────────────
  const onConnect = useCallback((params: Connection) => {
    pushSnapshot(nodes, edges);
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#8B5CF6', strokeWidth: 2 } }, eds));
  }, [nodes, edges, pushSnapshot, setEdges]);

  // ── Node click & update ────────────────────────────────────────────────────
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

  // ── AI Auto Builder ─────────────────────────────────────────────────────────
  const handleAIGenerate = useCallback(({ nodes: newNodes, edges: newEdges }: { nodes: Node[]; edges: Edge[] }) => {
    pushSnapshot(nodes, edges);
    setNodes(newNodes);
    setEdges(newEdges);
    setTimeout(() => fitView({ duration: 600, padding: 0.2 }), 100);
  }, [nodes, edges, pushSnapshot, setNodes, setEdges, fitView]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3 relative font-sans">
        {/* AI Copilot banner */}
        <AICopilotOverlay onAutoAddStep={(type, label) => handleAddNode(type, label)} />

        {/* TOP TOOLBAR */}
        <div className="h-14 px-4 rounded-2xl bg-[#111113] border border-[#27272A] flex items-center justify-between shrink-0 select-none shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <Zap size={15} />
            </div>
            <div>
              <h1 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Visual DAG Pipeline Builder</h1>
              <span className="text-[10px] font-mono text-zinc-500">production-backend • {nodes.length} nodes</span>
            </div>

            {/* Live DAG status badge */}
            <button
              onClick={() => setValidationModalOpen(true)}
              className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-lg border cursor-pointer transition-all ${
                validation.valid
                  ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40'
                  : 'text-rose-400 border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40'
              }`}
            >
              {validation.valid ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
              {validation.valid ? 'DAG Valid (Acyclic)' : `${validation.errors.length} DAG Error(s)`}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo / Redo */}
            <Button variant="ghost" size="sm" onClick={() => undo(nodes, edges)} disabled={!canUndo} title="Undo (Ctrl+Z)" className="p-2">
              <Undo2 size={13} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => redo(nodes, edges)} disabled={!canRedo} title="Redo (Ctrl+Y)" className="p-2">
              <Redo2 size={13} />
            </Button>

            <div className="h-4 w-px bg-[#27272A] mx-1" />

            <Button onClick={handleOpenYaml} variant="secondary" size="sm" className="gap-1.5 text-xs">
              <FileCode size={13} /><span>YAML</span>
            </Button>

            <Button onClick={handleSavePipeline} isLoading={isSaving} variant="secondary" size="sm" className="gap-1.5 text-xs">
              <Save size={13} /><span>Save</span>
            </Button>

            <Button onClick={handleSimulateRun} isLoading={isSimulating} variant="secondary" size="sm" className="gap-1.5 text-xs">
              <Play size={13} /><span>{isSimulating ? 'Simulating…' : 'Simulate'}</span>
            </Button>

            {/* REAL RUN BUTTON */}
            <Button onClick={handleRealTrigger} isLoading={isTriggering} variant="primary" size="sm" className="gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold">
              <Zap size={13} /><span>Trigger Real Run</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setInspectorOpen(!inspectorOpen)} className="p-2">
              <Sliders size={13} />
            </Button>
          </div>
        </div>

        {/* WORKSPACE */}
        <div className="flex-1 flex min-h-0 rounded-2xl border border-[#27272A] overflow-hidden bg-[#09090B] relative shadow-2xl">
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
              className="bg-[#09090B]"
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#27272A" />
              <Controls className="!bg-[#111113] !border-[#27272A] !text-zinc-300 !rounded-xl !shadow-2xl" />
              <MiniMap className="!bg-[#111113] !border-[#27272A] !rounded-xl !shadow-2xl" nodeColor="#3F3F46" />
            </ReactFlow>

            {/* AI Auto Builder floating bottom input */}
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

        {/* MODAL: VIEW & EXPORT YAML */}
        <Dialog open={yamlModalOpen} onClose={() => setYamlModalOpen(false)} title="Compiled Pipeline Specification (YAML)">
          <div className="space-y-4">
            <p className="text-xs text-zinc-400 font-sans">
              Real-time declarative workflow compiled from your visual DAG nodes via <code className="font-mono text-violet-400">DAGCompiler</code>.
            </p>
            <div className="h-80 rounded-xl overflow-hidden border border-[#27272A] bg-[#09090B]">
              <MonacoEditor
                language="yaml"
                value={generatedYaml}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  readOnly: true,
                }}
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-mono text-zinc-500">
                {validation.valid ? '✓ Ready for NestJS runner execution' : '⚠ Validation errors present'}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => navigator.clipboard.writeText(generatedYaml)}>
                  Copy YAML
                </Button>
                <Button variant="primary" onClick={() => setYamlModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Dialog>

        {/* MODAL: DAG VALIDATION REPORT */}
        <Dialog open={validationModalOpen} onClose={() => setValidationModalOpen(false)} title="DAG Graph Health & Execution Plan">
          <div className="space-y-4 font-sans text-xs">
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              validation.valid
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
            }`}>
              {validation.valid ? <CheckCircle2 size={18} className="shrink-0 text-emerald-400" /> : <XCircle size={18} className="shrink-0 text-rose-400" />}
              <div>
                <h4 className="font-bold text-sm">{validation.valid ? 'DAG is Valid & Acyclic' : 'DAG Contains Structural Errors'}</h4>
                <p className="text-xs text-zinc-300 mt-1">
                  {validation.valid
                    ? 'All dependencies resolve cleanly using Kahn’s Topological Sort with zero cycles.'
                    : 'The pipeline cannot execute until structural issues are resolved.'}
                </p>
              </div>
            </div>

            {validation.errors.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold uppercase tracking-wider text-rose-400 text-[10px]">Errors</span>
                <ul className="space-y-1">
                  {validation.errors.map((err, i) => (
                    <li key={i} className="flex items-center gap-2 text-rose-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold uppercase tracking-wider text-amber-400 text-[10px]">Warnings</span>
                <ul className="space-y-1">
                  {validation.warnings.map((w, i) => (
                    <li key={i} className="flex items-center gap-2 text-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validation.executionOrder.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#27272A]">
                <span className="font-bold uppercase tracking-wider text-zinc-400 text-[10px]">Execution Order ({validation.executionOrder.length} Steps)</span>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                  {validation.executionOrder.map((id, i) => {
                    const node = nodes.find((n) => n.id === id);
                    return (
                      <React.Fragment key={id}>
                        <span className="px-2 py-1 rounded-lg bg-[#111113] border border-[#27272A] text-zinc-300">
                          {i + 1}. {String(node?.data?.label ?? id)}
                        </span>
                        {i < validation.executionOrder.length - 1 && <ArrowRight size={11} className="text-zinc-600" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setValidationModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </Dialog>
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
