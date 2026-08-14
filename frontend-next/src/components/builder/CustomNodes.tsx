'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  GitBranch, Box, CheckSquare, ShieldCheck, Rocket, Bell,
  Loader2, Sparkles, MessageSquare, Activity, UserCheck, RotateCcw
} from 'lucide-react';

// ─── Execution run state ────────────────────────────────────────────────────
export type RunState = 'idle' | 'queued' | 'running' | 'success' | 'failed' | 'skipped';

function RunStateBadge({ state, elapsed }: { state: RunState; elapsed?: string }) {
  if (state === 'idle') return null;
  if (state === 'queued')
    return <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">◌ Queued</span>;
  if (state === 'running')
    return (
      <span className="text-[10px] font-mono text-violet-300 bg-violet-900/20 px-1.5 py-0.5 rounded border border-violet-700/40 flex items-center gap-1">
        <Loader2 size={9} className="animate-spin" />
        Running
      </span>
    );
  if (state === 'success')
    return <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/60">● {elapsed ?? 'Done'}</span>;
  if (state === 'failed')
    return <span className="text-[10px] font-mono text-rose-300 bg-rose-900/20 px-1.5 py-0.5 rounded border border-rose-700/40">✕ Failed</span>;
  if (state === 'skipped')
    return <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">— Skipped</span>;
  return null;
}

function NodeCommentPin({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <div className="absolute -top-2.5 -right-2.5 bg-violet-600 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-md border border-zinc-900 flex items-center gap-0.5 z-20">
      <MessageSquare size={8} />
      <span>{count}</span>
    </div>
  );
}

function nodeWrapClass(selected: boolean, runState: RunState) {
  const base = 'px-4 py-3 rounded-2xl border transition-all select-none w-60 relative bg-[#111113] shadow-lg shadow-black/40';
  const selectedRing = selected ? 'border-violet-500 ring-2 ring-violet-500/30 shadow-violet-950/30' : 'border-[#27272A] hover:border-zinc-700';
  const runRing =
    runState === 'running'
      ? 'ring-2 ring-violet-400/50 border-violet-500 shadow-violet-900/40 shadow-lg animate-pulse'
      : runState === 'success'
      ? 'border-emerald-500/40'
      : runState === 'failed'
      ? 'ring-2 ring-rose-500/40 border-rose-700'
      : '';
  return `${base} ${runState === 'idle' || runState === 'queued' ? selectedRing : runRing}`;
}

// ─── AI Ask Button ───────────────────────────────────────────────────────────
function AIStepButton() {
  return (
    <button className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 bg-[#09090B] border border-[#27272A] rounded-full px-2 py-0.5 whitespace-nowrap shadow z-10 cursor-pointer">
      <Sparkles size={9} className="text-violet-400" />
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

// ─── 1. Source / Trigger Node ────────────────────────────────────────────────
export const SourceNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
          <GitBranch size={14} className="text-violet-400 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Git Trigger')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-zinc-400 truncate">{String(d.repo ?? 'workspace/backend:main')}</p>
      <Handle type="source" position={Position.Right} className="!bg-violet-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <AIStepButton />
    </div>
  );
});
SourceNode.displayName = 'SourceNode';

// ─── 2. Build Node ───────────────────────────────────────────────────────────
export const BuildNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
          <Box size={14} className="text-blue-400 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Docker Build')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-zinc-400 truncate">{String(d.image ?? 'node:20-alpine')}</p>
      <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <AIStepButton />
    </div>
  );
});
BuildNode.displayName = 'BuildNode';

// ─── 3. Test Node ────────────────────────────────────────────────────────────
export const TestNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
          <CheckSquare size={14} className="text-emerald-400 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Test Suite')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-zinc-400 truncate">{String(d.command ?? 'npm test')}</p>
      <Handle type="source" position={Position.Right} className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <AIStepButton />
    </div>
  );
});
TestNode.displayName = 'TestNode';

// ─── 4. Security Node ────────────────────────────────────────────────────────
export const SecurityNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
          <ShieldCheck size={14} className="text-amber-400 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Trivy Security')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-zinc-400 truncate">Vulnerability SAST Scan</p>
      <Handle type="source" position={Position.Right} className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <AIStepButton />
    </div>
  );
});
SecurityNode.displayName = 'SecurityNode';

// ─── 5. Deploy Node ──────────────────────────────────────────────────────────
export const DeployNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
          <Rocket size={14} className="text-purple-400 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Deployment')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-zinc-400 truncate">{String(d.target ?? 'production')}</p>
      <Handle type="source" position={Position.Right} className="!bg-purple-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <AIStepButton />
    </div>
  );
});
DeployNode.displayName = 'DeployNode';

// ─── 6. Health Check Node ────────────────────────────────────────────────────
export const HealthCheckNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
          <Activity size={14} className="text-teal-400 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Health Probe')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-zinc-400 truncate">{String(d.endpoint ?? 'GET /health : 200')}</p>
      <Handle type="source" position={Position.Right} className="!bg-teal-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <AIStepButton />
    </div>
  );
});
HealthCheckNode.displayName = 'HealthCheckNode';

// ─── 7. Approval Gate Node ───────────────────────────────────────────────────
export const ApprovalNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
          <UserCheck size={14} className="text-yellow-400 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Approval Gate')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-zinc-400 truncate">{String(d.approvers ?? 'Role: ADMIN required')}</p>
      <Handle type="source" position={Position.Right} className="!bg-yellow-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <AIStepButton />
    </div>
  );
});
ApprovalNode.displayName = 'ApprovalNode';

// ─── 8. Rollback Node ────────────────────────────────────────────────────────
export const RollbackNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
          <RotateCcw size={14} className="text-rose-400 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Rollback Hook')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-zinc-400 truncate">{String(d.strategy ?? 'Auto-revert to N-1')}</p>
      <Handle type="source" position={Position.Right} className="!bg-rose-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <AIStepButton />
    </div>
  );
});
RollbackNode.displayName = 'RollbackNode';

// ─── 9. Notification Node ────────────────────────────────────────────────────
export const NotificationNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  const runState = (d.runState ?? 'idle') as RunState;
  return (
    <div className={`${nodeWrapClass(!!selected, runState)} group`}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2.5 !h-2.5 !border-2 !border-[#09090B]" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
          <Bell size={14} className="text-indigo-400 shrink-0" />
          <span className="truncate">{String(d.label ?? 'Slack Notify')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono text-zinc-400 truncate">#devops-deployments</p>
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
  health: HealthCheckNode,
  approval: ApprovalNode,
  rollback: RollbackNode,
  notification: NotificationNode,
};
