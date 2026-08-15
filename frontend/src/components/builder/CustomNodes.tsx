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
    return (
      <span
        className="text-[10px] font-mono border px-1.5 py-0.5 rounded"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        ◌ Queued
      </span>
    );
  if (state === 'running')
    return (
      <span
        className="text-[10px] font-mono border px-1.5 py-0.5 rounded flex items-center gap-1"
        style={{
          background: 'var(--info-dim)',
          borderColor: 'var(--info)',
          color: 'var(--info)',
        }}
      >
        <Loader2 size={9} className="animate-spin" />
        Running
      </span>
    );
  if (state === 'success')
    return (
      <span
        className="text-[10px] font-mono border px-1.5 py-0.5 rounded"
        style={{
          background: 'var(--success-dim)',
          borderColor: 'var(--success)',
          color: 'var(--success)',
        }}
      >
        ● {elapsed ?? 'Done'}
      </span>
    );
  if (state === 'failed')
    return (
      <span
        className="text-[10px] font-mono border px-1.5 py-0.5 rounded"
        style={{
          background: 'var(--error-dim)',
          borderColor: 'var(--error)',
          color: 'var(--error)',
        }}
      >
        ✕ Failed
      </span>
    );
  if (state === 'skipped')
    return (
      <span
        className="text-[10px] font-mono border px-1.5 py-0.5 rounded"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        — Skipped
      </span>
    );
  return null;
}

function NodeCommentPin({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <div
      className="absolute -top-2.5 -right-2.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-md flex items-center gap-0.5 z-20 border"
      style={{ background: 'var(--accent)', color: 'var(--accent-fg)', borderColor: 'var(--bg-primary)' }}
    >
      <MessageSquare size={8} />
      <span>{count}</span>
    </div>
  );
}

function nodeWrapClass(selected: boolean, runState: RunState) {
  const base = 'px-4 py-3 rounded-2xl border transition-all select-none w-60 relative shadow-sm';
  const selectedRing = selected ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30' : 'border-[var(--border)] hover:border-[var(--border-bright)]';
  const runRing =
    runState === 'running'
      ? 'ring-2 ring-[var(--info)] border-[var(--info)] animate-pulse'
      : runState === 'success'
      ? 'border-[var(--success)]'
      : runState === 'failed'
      ? 'ring-2 ring-[var(--error)] border-[var(--error)]'
      : '';
  return `${base} ${runState === 'idle' || runState === 'queued' ? selectedRing : runRing}`;
}

// ─── AI Ask Button ───────────────────────────────────────────────────────────
function AIStepButton() {
  return (
    <button
      className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] border rounded-full px-2 py-0.5 whitespace-nowrap shadow z-10 cursor-pointer"
      style={{
        background: 'var(--bg-primary)',
        borderColor: 'var(--border)',
        color: 'var(--text-muted)',
      }}
    >
      <Sparkles size={9} style={{ color: 'var(--accent)' }} />
      <span>Ask AI</span>
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
    <div className={`${nodeWrapClass(!!selected, runState)} group`} style={{ background: 'var(--bg-secondary)' }}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          <GitBranch size={14} style={{ color: 'var(--accent)' }} className="shrink-0" />
          <span className="truncate">{String(d.label ?? 'Git Trigger')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{String(d.repo ?? 'workspace/backend:main')}</p>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--accent)', borderColor: 'var(--bg-primary)' }} />
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
    <div className={`${nodeWrapClass(!!selected, runState)} group`} style={{ background: 'var(--bg-secondary)' }}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--text-muted)', borderColor: 'var(--bg-primary)' }} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          <Box size={14} style={{ color: 'var(--info)' }} className="shrink-0" />
          <span className="truncate">{String(d.label ?? 'Docker Build')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{String(d.image ?? 'node:20-alpine')}</p>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--info)', borderColor: 'var(--bg-primary)' }} />
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
    <div className={`${nodeWrapClass(!!selected, runState)} group`} style={{ background: 'var(--bg-secondary)' }}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--text-muted)', borderColor: 'var(--bg-primary)' }} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          <CheckSquare size={14} style={{ color: 'var(--success)' }} className="shrink-0" />
          <span className="truncate">{String(d.label ?? 'Test Suite')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{String(d.command ?? 'npm test')}</p>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--success)', borderColor: 'var(--bg-primary)' }} />
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
    <div className={`${nodeWrapClass(!!selected, runState)} group`} style={{ background: 'var(--bg-secondary)' }}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--text-muted)', borderColor: 'var(--bg-primary)' }} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          <ShieldCheck size={14} style={{ color: 'var(--warning)' }} className="shrink-0" />
          <span className="truncate">{String(d.label ?? 'Trivy Security')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>Vulnerability SAST Scan</p>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--warning)', borderColor: 'var(--bg-primary)' }} />
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
    <div className={`${nodeWrapClass(!!selected, runState)} group`} style={{ background: 'var(--bg-secondary)' }}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--text-muted)', borderColor: 'var(--bg-primary)' }} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          <Rocket size={14} style={{ color: 'var(--accent)' }} className="shrink-0" />
          <span className="truncate">{String(d.label ?? 'Deployment')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{String(d.target ?? 'production')}</p>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--accent)', borderColor: 'var(--bg-primary)' }} />
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
    <div className={`${nodeWrapClass(!!selected, runState)} group`} style={{ background: 'var(--bg-secondary)' }}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--text-muted)', borderColor: 'var(--bg-primary)' }} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          <Activity size={14} style={{ color: 'var(--info)' }} className="shrink-0" />
          <span className="truncate">{String(d.label ?? 'Health Probe')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{String(d.endpoint ?? 'GET /health : 200')}</p>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--info)', borderColor: 'var(--bg-primary)' }} />
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
    <div className={`${nodeWrapClass(!!selected, runState)} group`} style={{ background: 'var(--bg-secondary)' }}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--text-muted)', borderColor: 'var(--bg-primary)' }} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          <UserCheck size={14} style={{ color: 'var(--warning)' }} className="shrink-0" />
          <span className="truncate">{String(d.label ?? 'Approval Gate')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{String(d.approvers ?? 'Role: ADMIN required')}</p>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--warning)', borderColor: 'var(--bg-primary)' }} />
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
    <div className={`${nodeWrapClass(!!selected, runState)} group`} style={{ background: 'var(--bg-secondary)' }}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--text-muted)', borderColor: 'var(--bg-primary)' }} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          <RotateCcw size={14} style={{ color: 'var(--error)' }} className="shrink-0" />
          <span className="truncate">{String(d.label ?? 'Rollback Hook')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{String(d.strategy ?? 'Auto-revert to N-1')}</p>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--error)', borderColor: 'var(--bg-primary)' }} />
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
    <div className={`${nodeWrapClass(!!selected, runState)} group`} style={{ background: 'var(--bg-secondary)' }}>
      <NodeCommentPin count={d.commentsCount as number | undefined} />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !border-2" style={{ background: 'var(--text-muted)', borderColor: 'var(--bg-primary)' }} />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          <Bell size={14} style={{ color: 'var(--accent)' }} className="shrink-0" />
          <span className="truncate">{String(d.label ?? 'Slack Notify')}</span>
        </div>
        <RunStateBadge state={runState} elapsed={d.elapsed as string | undefined} />
      </div>
      <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>#devops-deployments</p>
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
