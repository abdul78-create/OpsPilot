'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, Box, CheckSquare, ShieldCheck, Rocket, Bell, Loader2, Sparkles, MessageSquare } from 'lucide-react';

// ─── Execution run state ────────────────────────────────────────────────────
export type RunState = 'idle' | 'queued' | 'running' | 'success' | 'failed' | 'skipped';

function RunStateBadge({ state, elapsed }: { state: RunState; elapsed?: string }) {
  if (state === 'idle') return null;
  if (state === 'queued')
    return <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">◌ Queued</span>;
  if (state === 'running')
    return (
      <span className="text-[10px] font-mono text-blue-300 bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-700/40 flex items-center gap-1">
        <Loader2 size={9} className="animate-spin" />
        Running
      </span>
    );
  if (state === 'success')
    return <span className="text-[10px] font-mono text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700">● {elapsed ?? 'Done'}</span>;
  if (state === 'failed')
    return <span className="text-[10px] font-mono text-rose-300 bg-rose-900/20 px-1.5 py-0.5 rounded border border-rose-700/40">✕ Failed</span>;
  if (state === 'skipped')
    return <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded border border-slate-800">— Skipped</span>;
  return null;
}

function NodeCommentPin({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <div className="absolute -top-2.5 -right-2.5 bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-md border border-slate-900 flex items-center gap-0.5 z-20">
      <MessageSquare size={8} />
      <span>{count}</span>
    </div>
  );
}

function nodeWrapClass(selected: boolean, runState: RunState) {
  const base = 'px-4 py-3 rounded-xl border transition-all select-none w-56 relative bg-slate-900';
  const selectedRing = selected ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'border-slate-800';
  const runRing =
    runState === 'running'
      ? 'ring-2 ring-blue-400/50 border-blue-600 shadow-blue-900/40 shadow-lg animate-pulse'
      : runState === 'success'
      ? 'border-slate-600'
      : runState === 'failed'
      ? 'ring-2 ring-rose-500/40 border-rose-700'
      : '';
  return `${base} ${runState === 'idle' || runState === 'queued' ? selectedRing : runRing}`;
}

// ─── AI Ask Button ───────────────────────────────────────────────────────────
function AIStepButton() {
  return (
    <button className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-full px-2 py-0.5 whitespace-nowrap shadow z-10">
      <Sparkles size={9} />
      Ask AI
    </button>
  );
}

// ─── Shared node data type ────────────────────────────────────────────────────
interface BaseNodeData {
  label?: string;
  runState?: RunState;
  elapsed?: string;
  commentsCount?: number;
  [key: string]: unknown;
}

// ─── Source Node ─────────────────────────────────────────────────────────────
export const SourceNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
          <GitBranch size={14} className="text-slate-300 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Git Source')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-slate-400 truncate">{String(d.repo ?? 'acme/backend:main')}</p>
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
      <AIStepButton />
    </div>
  );
});
SourceNode.displayName = 'SourceNode';

// ─── Build Node ───────────────────────────────────────────────────────────────
export const BuildNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
          <Box size={14} className="text-slate-300 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Docker Build')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-slate-400 truncate">{String(d.image ?? 'node:20-alpine')}</p>
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
      <AIStepButton />
    </div>
  );
});
BuildNode.displayName = 'BuildNode';

// ─── Test Node ────────────────────────────────────────────────────────────────
export const TestNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
          <CheckSquare size={14} className="text-slate-300 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Integration Tests')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-slate-400 truncate">{String(d.command ?? 'npm test')}</p>
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
      <AIStepButton />
    </div>
  );
});
TestNode.displayName = 'TestNode';

// ─── Security Node ────────────────────────────────────────────────────────────
export const SecurityNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
          <ShieldCheck size={14} className="text-slate-300 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Trivy Security')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-slate-400 truncate">Vulnerability Scan</p>
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
      <AIStepButton />
    </div>
  );
});
SecurityNode.displayName = 'SecurityNode';

// ─── Deploy Node ──────────────────────────────────────────────────────────────
export const DeployNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
          <Rocket size={14} className="text-slate-300 shrink-0" />
          <span className="truncate">{String(d.label ?? 'K8s Deploy')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-slate-400 truncate">{String(d.target ?? 'prod-us-east-1')}</p>
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
      <AIStepButton />
    </div>
  );
});
DeployNode.displayName = 'DeployNode';

// ─── Notification Node ────────────────────────────────────────────────────────
export const NotificationNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
          <Bell size={14} className="text-slate-300 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Slack Notify')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-slate-400 truncate">#devops-deployments</p>
      <AIStepButton />
    </div>
  );
});
NotificationNode.displayName = 'NotificationNode';

// ─── Node type registry ───────────────────────────────────────────────────────
export const nodeTypes = {
  source: SourceNode,
  build: BuildNode,
  test: TestNode,
  security: SecurityNode,
  deploy: DeployNode,
  notification: NotificationNode,
};
