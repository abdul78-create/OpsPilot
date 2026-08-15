'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  Activity, Clock, RefreshCw, CheckCircle2, XCircle, Loader2,
  GitCommit, GitBranch, ChevronRight, AlertTriangle, Search,
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

const STATUS_CFG: Record<RunStatus, { text: string; bg: string; dot: string; icon: React.ElementType }> = {
  SUCCESS:   { text: 'text-[var(--success)]',      bg: 'bg-[var(--success-dim)]',  dot: 'bg-[var(--success)]',                    icon: CheckCircle2   },
  FAILED:    { text: 'text-[var(--error)]',         bg: 'bg-[var(--error-dim)]',    dot: 'bg-[var(--error)]',                      icon: XCircle        },
  RUNNING:   { text: 'text-[var(--info)]',          bg: 'bg-[var(--info-dim)]',     dot: 'bg-[var(--info)] animate-pulse',         icon: RefreshCw      },
  QUEUED:    { text: 'text-[var(--warning)]',       bg: 'bg-[var(--warning-dim)]',  dot: 'bg-[var(--warning)]',                    icon: Clock          },
  CANCELLED: { text: 'text-[var(--text-muted)]',   bg: 'bg-[var(--bg-tertiary)]',  dot: 'bg-[var(--text-muted)]',                 icon: AlertTriangle  },
  TIMEOUT:   { text: 'text-[var(--warning)]',       bg: 'bg-[var(--warning-dim)]',  dot: 'bg-[var(--warning)]',                    icon: AlertTriangle  },
};

function StatusPill({ status }: { status: RunStatus }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.CANCELLED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-[var(--border)] ${c.text} ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
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
        <div className="h-14 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Activity size={15} className="text-[var(--text-muted)]" />
            <h1 className="text-sm font-bold text-[var(--text-primary)]">Pipeline Runs</h1>
            <span className="text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-full">
              {filtered.length} runs
            </span>
          </div>

          <button onClick={load} className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Filter by repo, branch, or commit..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-bright)]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-1">
            <button
              onClick={() => { setStatusFilter('ALL'); setPage(1); }}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${statusFilter === 'ALL' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            >
              ALL
            </button>
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${statusFilter === s ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col">
          <div className="h-9 px-4 border-b border-[var(--border)] flex items-center gap-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider shrink-0 bg-[var(--bg-tertiary)]">
            <span className="w-24">Status</span>
            <span className="w-48">Repository</span>
            <span className="w-32">Branch</span>
            <span className="w-24">Commit</span>
            <span className="w-24 text-right">Duration</span>
            <span className="flex-1 text-right">Started</span>
            <span className="w-16"></span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-5 w-20 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                    <div className="h-4 w-40 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                    <div className="h-4 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                    <div className="h-4 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                  </div>
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Activity size={32} className="text-[var(--text-muted)] mb-2" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">No runs match criteria</p>
              </div>
            ) : (
              paginated.map(r => (
                <div
                  key={r.id}
                  onClick={() => router.push(`/runs/${r.id}`)}
                  className="h-12 px-4 flex items-center gap-4 text-xs cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors group"
                >
                  <div className="w-24">
                    <StatusPill status={r.status as RunStatus} />
                  </div>

                  <div className="w-48 font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">
                    {shortRepo(r.repositoryUrl)}
                  </div>

                  <div className="w-32 font-mono text-[11px] text-[var(--text-muted)] flex items-center gap-1 truncate">
                    <GitBranch size={10} className="shrink-0" />
                    <span className="truncate">{r.branch ?? 'main'}</span>
                  </div>

                  <div className="w-24 font-mono text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                    <GitCommit size={10} className="shrink-0" />
                    <span>{shortSha(r.commitSha)}</span>
                  </div>

                  <div className="w-24 text-right font-mono text-[11px] text-[var(--text-muted)]">
                    {r.durationSeconds ? `${r.durationSeconds}s` : '—'}
                  </div>

                  <div className="flex-1 text-right text-[11px] text-[var(--text-muted)] font-mono">
                    {timeAgo(r.startedAt ?? r.createdAt)}
                  </div>

                  <div className="w-16 flex justify-end">
                    {r.status === 'RUNNING' && (
                      <button
                        onClick={e => handleCancel(r.id, e)}
                        disabled={cancelling === r.id}
                        className="text-[10px] text-[var(--error)] hover:opacity-80 font-semibold px-2 py-0.5 rounded border border-[var(--error)] transition-opacity"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {hasMore && (
            <div className="p-3 border-t border-[var(--border)] flex justify-center">
              <button
                onClick={() => setPage(p => p + 1)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Load more ({filtered.length - paginated.length} remaining)
              </button>
            </div>
          )}
        </div>
      </div>
    </DeveloperShell>
  );
}
