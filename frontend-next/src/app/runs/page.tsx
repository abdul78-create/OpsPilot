'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  Activity, Clock, RefreshCw, Play, CheckCircle2, XCircle, Loader2,
  Circle, Filter, Search, GitCommit, GitBranch, ChevronRight, X, Download,
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
type RunStatus = 'SUCCESS' | 'FAILED' | 'RUNNING' | 'QUEUED' | 'CANCELLED';

const STATUS_CFG: Record<RunStatus, { color: string; bg: string; border: string; dot: string; icon: React.ElementType }> = {
  SUCCESS:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', icon: CheckCircle2 },
  FAILED:    { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-400',     icon: XCircle },
  RUNNING:   { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    dot: 'bg-blue-400',    icon: Loader2 },
  QUEUED:    { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-400',   icon: Circle },
  CANCELLED: { color: 'text-zinc-400',    bg: 'bg-zinc-500/10',    border: 'border-zinc-500/20',    dot: 'bg-zinc-400',    icon: X },
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
      // listAllRuns returns PipelineRun[] directly
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

  const statusCounts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = runs.filter(r => r.status === s).length;
    return acc;
  }, {} as Record<RunStatus, number>);

  return (
    <DeveloperShell>
      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between animate-fade-in">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">Pipeline Runs</h1>
            <p className="text-sm text-zinc-500">
              {runs.length} total runs · {statusCounts.RUNNING ?? 0} active
            </p>
          </div>
          <button
            onClick={() => load()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111113] border border-[#27272A] hover:border-[#3F3F46] text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 animate-slide-up delay-75">
          {(['ALL', ...ALL_STATUSES] as const).map((s) => {
            const count = s === 'ALL' ? runs.length : statusCounts[s] ?? 0;
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
                  active
                    ? 'bg-violet-600/15 text-violet-300 border-violet-500/30'
                    : 'bg-[#111113] text-zinc-500 border-[#27272A] hover:text-zinc-300 hover:border-[#3F3F46]'
                }`}
              >
                {s === 'ALL' ? <Activity size={11} /> : null}
                {s}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${active ? 'bg-violet-500/20 text-violet-300' : 'bg-[#18181B] text-zinc-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative animate-slide-up delay-100">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by repo, branch, or commit SHA..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#111113] border border-[#27272A] focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 focus:outline-none rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 transition-all"
          />
        </div>

        {/* Runs Table */}
        <div className="bg-[#111113] border border-[#27272A] rounded-xl overflow-hidden animate-slide-up delay-150">
          {/* Table Header */}
          <div className="grid grid-cols-[140px_1fr_100px_80px_80px_36px] gap-4 px-5 py-3 border-b border-[#1C1C1F] text-[11px] font-semibold text-zinc-600 uppercase tracking-widest">
            <span>Status</span>
            <span>Repository</span>
            <span>Branch</span>
            <span>Duration</span>
            <span>Started</span>
            <span />
          </div>

          {loading ? (
            <div className="divide-y divide-[#1C1C1F]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[140px_1fr_100px_80px_80px_36px] gap-4 px-5 py-4 items-center">
                  <div className="skeleton h-5 w-20 rounded-full" />
                  <div className="skeleton h-3.5 w-full rounded" />
                  <div className="skeleton h-3 w-16 rounded" />
                  <div className="skeleton h-3 w-10 rounded" />
                  <div className="skeleton h-3 w-14 rounded" />
                  <div className="skeleton h-3 w-6 rounded" />
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#18181B] flex items-center justify-center mb-4">
                <Play size={20} className="text-zinc-600" />
              </div>
              <p className="text-sm font-medium text-zinc-400 mb-1">No runs found</p>
              <p className="text-xs text-zinc-600">
                {search ? 'Try a different search term' : 'Trigger a pipeline to see runs here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#1C1C1F]">
              {paginated.map((run) => (
                <div
                  key={run.id}
                  onClick={() => router.push(`/runs/${run.id}`)}
                  className="grid grid-cols-[140px_1fr_100px_80px_80px_36px] gap-4 px-5 py-3.5 items-center hover:bg-[#18181B] cursor-pointer transition-colors group"
                >
                  <StatusPill status={run.status as RunStatus} />

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                      {shortRepo(run.repositoryUrl)}
                    </p>
                    <p className="text-[11px] text-zinc-600 flex items-center gap-1 mt-0.5">
                      <GitCommit size={10} /> {shortSha(run.commitSha)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    {run.branch && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 truncate max-w-full">
                        <GitBranch size={10} /> {run.branch}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                    {run.durationSeconds ? (
                      <><Clock size={11} /> {run.durationSeconds}s</>
                    ) : '—'}
                  </span>

                  <span className="text-[11px] text-zinc-500">{timeAgo(run.startedAt)}</span>

                  <div className="flex items-center gap-1">
                    {(run.status === 'RUNNING' || run.status === 'QUEUED') && (
                      <button
                        onClick={(e) => handleCancel(run.id, e)}
                        disabled={cancelling === run.id}
                        title="Cancel run"
                        className="p-1 rounded text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        {cancelling === run.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      </button>
                    )}
                    <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="border-t border-[#1C1C1F] p-3 text-center">
              <button
                onClick={() => setPage(p => p + 1)}
                className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
              >
                Load {Math.min(PAGE_SIZE, filtered.length - paginated.length)} more
              </button>
            </div>
          )}
        </div>
      </div>
    </DeveloperShell>
  );
}
