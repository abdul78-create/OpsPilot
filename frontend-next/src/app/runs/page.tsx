'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  Activity, Clock, RefreshCw, Play, CheckCircle2, XCircle, Loader2,
  Circle, Filter, Search, GitCommit, GitBranch, ChevronRight, X, Download, AlertTriangle,
} from 'lucide-react';

import { listAllRuns, cancelRun, PipelineRun } from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';

/* ── Helpers ───────────────────────────────────── */
function timeAgo(dateStr?: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function shortSha(s?: string) { return s ? s.slice(0, 7) : '—'; }
function shortRepo(url?: string) {
  if (!url) return 'Unknown';
  try { return new URL(url).pathname.replace(/^\//, '').replace(/\.git$/, ''); } catch { return url; }
}

/* ── Status Pill ───────────────────────────────── */
type RunStatus = 'SUCCESS' | 'FAILED' | 'RUNNING' | 'QUEUED' | 'CANCELLED' | 'TIMEOUT';

const STATUS_CFG: Record<RunStatus, { color: string; bg: string; border: string; dot: string; icon: React.ElementType }> = {
  SUCCESS:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', icon: CheckCircle2 },
  FAILED:    { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-400',     icon: XCircle },
  RUNNING:   { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    dot: 'bg-blue-400 animate-pulse', icon: RefreshCw },
  QUEUED:    { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-400',   icon: Clock },
  CANCELLED: { color: 'text-zinc-400',    bg: 'bg-zinc-500/10',    border: 'border-zinc-500/20',    dot: 'bg-zinc-400',    icon: AlertTriangle },
  TIMEOUT:   { color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  dot: 'bg-orange-400',  icon: AlertTriangle },
};

function StatusPill({ status }: { status: RunStatus }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.CANCELLED;
  const IconComp = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${c.color} ${c.bg} border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'RUNNING' ? 'animate-pulse-glow' : ''}`} />
      {status}
    </span>
  );
}

const ALL_STATUSES: RunStatus[] = ['SUCCESS', 'FAILED', 'RUNNING', 'QUEUED', 'CANCELLED'];

const PAGE_SIZE = 15;

/* ── Main Page ─────────────────────────────────── */
export default function RunsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAllRuns();
      if (Array.isArray(res)) setRuns(res);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = runs.filter(r => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || shortRepo(r.repositoryUrl).toLowerCase().includes(q)
      || (r.branch ?? '').toLowerCase().includes(q)
      || (r.commitSha ?? '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCancelling(id);
    try {
      await cancelRun(id);
      toast({ kind: 'success', title: 'Run cancelled' });
      load();
    } catch {
      toast({ kind: 'error', title: 'Failed to cancel run' });
    } finally {
      setCancelling(null);
    }
  };

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">

        {/* Header */}
        <div className="h-14 px-4 rounded-xl bg-[#111113] border border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Activity size={16} className="text-violet-400" />
            <h1 className="text-sm font-bold text-zinc-100">Pipeline Runs</h1>
            <span className="text-[10px] font-mono text-zinc-500 border border-[#27272A] px-2 py-0.5 rounded-full">
              {filtered.length} runs
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={load} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Filter by repo, branch, or commit..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#111113] border border-[#27272A] text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#111113] border border-[#27272A] rounded-lg p-1">
            <button
              onClick={() => { setStatusFilter('ALL'); setPage(1); }}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${statusFilter === 'ALL' ? 'bg-[#27272A] text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              ALL
            </button>
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${statusFilter === s ? 'bg-[#27272A] text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table / List */}
        <div className="flex-1 min-h-0 bg-[#111113] border border-[#27272A] rounded-xl overflow-hidden flex flex-col">
          <div className="h-9 px-4 border-b border-[#27272A] flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 bg-[#18181B]/40">
            <span className="w-24">Status</span>
            <span className="w-48">Repository</span>
            <span className="w-32">Branch</span>
            <span className="w-24">Commit</span>
            <span className="w-24 text-right">Duration</span>
            <span className="flex-1 text-right">Started</span>
            <span className="w-16"></span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#1C1C1F]">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="skeleton h-5 w-20 rounded-full" />
                    <div className="skeleton h-4 w-40 rounded" />
                    <div className="skeleton h-4 w-24 rounded" />
                    <div className="skeleton h-4 w-16 rounded" />
                  </div>
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Activity size={32} className="text-zinc-600 mb-2" />
                <p className="text-sm font-medium text-zinc-400">No runs match criteria</p>
              </div>
            ) : (
              paginated.map(r => (
                <div
                  key={r.id}
                  onClick={() => router.push(`/runs/${r.id}`)}
                  className="h-12 px-4 flex items-center gap-4 text-xs cursor-pointer hover:bg-[#18181B]/35 transition-colors group"
                >
                  <div className="w-24">
                    <StatusPill status={r.status} />
                  </div>

                  <div className="w-48 font-medium text-zinc-200 group-hover:text-white truncate">
                    {shortRepo(r.repositoryUrl)}
                  </div>

                  <div className="w-32 font-mono text-[11px] text-zinc-400 flex items-center gap-1 truncate">
                    <GitBranch size={10} className="text-zinc-500 shrink-0" />
                    <span className="truncate">{r.branch ?? 'main'}</span>
                  </div>

                  <div className="w-24 font-mono text-[11px] text-zinc-500 flex items-center gap-1">
                    <GitCommit size={10} className="text-zinc-600 shrink-0" />
                    <span>{shortSha(r.commitSha)}</span>
                  </div>

                  <div className="w-24 text-right font-mono text-[11px] text-zinc-400">
                    {r.durationSeconds ? `${r.durationSeconds}s` : '—'}
                  </div>

                  <div className="flex-1 text-right text-[11px] text-zinc-500 font-mono">
                    {timeAgo(r.startedAt ?? r.createdAt)}
                  </div>

                  <div className="w-16 flex justify-end">
                    {r.status === 'RUNNING' && (
                      <button
                        onClick={e => handleCancel(r.id, e)}
                        disabled={cancelling === r.id}
                        className="text-[10px] text-red-400 hover:text-red-300 font-semibold px-2 py-0.5 rounded border border-red-500/30 hover:border-red-500/50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DeveloperShell>
  );
}
