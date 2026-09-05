'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  GitBranch, Play, RefreshCw, Plus, Loader2, CheckCircle2, Clock, Activity,
} from 'lucide-react';
import {
  listPipelines, triggerPipeline, Pipeline,
} from '@/lib/apiClient';
import {
  SkeletonTableRows, EmptyState, StatusPill, SearchInput, Pagination,
} from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';

function timeAgo(d?: string) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const PAGE_SIZE = 20;

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [triggering, setTriggering] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPipelines();
      setPipelines(res.data ?? []);
    } catch {
      toast({ kind: 'error', title: 'Failed to load pipelines' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleTrigger = async (p: Pipeline) => {
    setTriggering(p.id);
    try {
      const res = await triggerPipeline(p.id, p.branch);
      const runId = res.data.id;
      toast({ kind: 'success', title: 'Pipeline triggered', message: `Run #${runId.slice(0, 8)} queued` });
      router.push(`/runs/${runId}/`);
    } catch {
      toast({ kind: 'error', title: 'Trigger failed', message: 'Check your pipeline config' });
    } finally {
      setTriggering(null);
    }
  };

  const filtered = pipelines.filter(p =>
    !search || (p.name + (p.repositoryUrl ?? '')).toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: pipelines.length,
    running: pipelines.filter(p => p.status === 'RUNNING').length,
    passing: pipelines.filter(p => p.status === 'SUCCESS').length,
  };

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-4 max-w-7xl mx-auto w-full">

        {/* Header */}
        <div className="h-14 px-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--accent)]">
              <GitBranch size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-[var(--text-primary)]">Pipelines</h1>
                <span className="text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                  {stats.total} total
                </span>
                {stats.running > 0 && (
                  <span className="text-[10px] font-mono text-[var(--info)] border border-[var(--border)] bg-[var(--info-dim)] px-2 py-0.5 rounded-full animate-pulse font-semibold">
                    ● {stats.running} running
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">Automated CI/CD definitions and deployment workflows</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-all"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => router.push('/builder')}
              className="flex items-center gap-1.5 text-xs bg-[var(--accent)] text-[var(--accent-fg)] px-3.5 py-1.5 rounded-xl font-semibold transition-all hover:opacity-90 shadow-sm"
            >
              <Plus size={13} />
              <span>New Pipeline</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          {[
            { label: 'Configured Pipelines', value: stats.total, icon: Activity, color: 'text-[var(--text-muted)]' },
            { label: 'Active Workflows', value: stats.running, icon: Loader2, color: 'text-[var(--info)]', spin: stats.running > 0 },
            { label: 'Passing Pipelines', value: stats.passing, icon: CheckCircle2, color: 'text-[var(--success)]' },
          ].map(({ label, value, icon: Icon, color, spin }) => (
            <div key={label} className="bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-bright)] rounded-2xl p-4 flex items-center justify-between transition-all">
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">{label}</div>
                <div className="text-2xl font-bold text-[var(--text-primary)] font-mono mt-1">{value}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <Icon size={18} className={`${color} ${spin ? 'animate-spin' : ''}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="shrink-0 max-w-md">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Filter pipelines by name or repository URL..." />
        </div>

        {/* Table Container */}
        <div className="flex-1 min-h-0 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col shadow-sm">
          <div className="h-10 px-5 border-b border-[var(--border)] flex items-center gap-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider shrink-0 bg-[var(--bg-tertiary)]">
            <span className="flex-1">Pipeline & Branch</span>
            <span className="w-40">Repository</span>
            <span className="w-28 text-right">Success Rate</span>
            <span className="w-28 text-right">Last Trigger</span>
            <span className="w-24 text-center">Status</span>
            <span className="w-20 text-right">Actions</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <SkeletonTableRows rows={6} cols={6} />
            ) : paginated.length === 0 ? (
              <EmptyState
                icon={<GitBranch size={32} />}
                title="No pipelines found"
                description={search ? "No pipelines match your search filter." : "Create your first automated CI/CD pipeline using the Visual Builder."}
                action={
                  <button
                    onClick={() => router.push('/builder')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    <Plus size={13} />
                    <span>Open Visual Builder</span>
                  </button>
                }
              />
            ) : (
              paginated.map(p => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/runs/?pipelineId=${p.id}`)}
                  className="h-14 px-5 border-b border-[var(--border)] flex items-center gap-4 text-xs cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">{p.name}</div>
                    {p.branch && (
                      <div className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                        <GitBranch size={10} /> {p.branch}
                      </div>
                    )}
                  </div>

                  <div className="w-40 text-[11px] font-mono text-[var(--text-muted)] truncate">
                    {p.repositoryUrl?.replace('https://github.com/', '') ?? '—'}
                  </div>

                  <div className="w-28 text-right">
                    {p.successRate !== undefined ? (
                      <span className={`text-[11px] font-bold font-mono ${p.successRate >= 80 ? 'text-[var(--success)]' : p.successRate >= 50 ? 'text-[var(--warning)]' : 'text-[var(--error)]'}`}>
                        {p.successRate.toFixed(0)}%
                      </span>
                    ) : <span className="text-[var(--text-muted)] font-mono">—</span>}
                  </div>

                  <div className="w-28 text-right font-mono text-[10px] text-[var(--text-muted)] flex items-center justify-end gap-1">
                    <Clock size={11} /> {timeAgo(p.lastRunAt)}
                  </div>

                  <div className="w-24 flex justify-center">
                    <StatusPill status={p.status ?? 'queued'} />
                  </div>

                  <div className="w-20 flex justify-end" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleTrigger(p)}
                      disabled={triggering === p.id}
                      className="flex items-center gap-1 text-[11px] font-semibold bg-[var(--accent)] text-[var(--accent-fg)] px-3 py-1 rounded-lg transition-opacity hover:opacity-85 disabled:opacity-50 shadow-sm"
                    >
                      {triggering === p.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                      Run
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination page={page} total={filtered.length} limit={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>
    </DeveloperShell>
  );
}
