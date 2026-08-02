'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  GitBranch, Play, Pause, RefreshCw, ChevronRight, Plus,
  Loader2, CheckCircle2, XCircle, Clock, GitCommit, Activity,
  Trash2,
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
      router.push(`/runs/${runId}`);
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
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">

        {/* Header */}
        <div className="h-14 px-4 rounded-xl bg-[#111113] border border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <GitBranch size={16} className="text-violet-400" />
            <h1 className="text-sm font-bold text-zinc-100">Pipelines</h1>
            <span className="text-[10px] font-mono text-zinc-500 border border-[#27272A] px-2 py-0.5 rounded-full">{stats.total} total</span>
            {stats.running > 0 && (
              <span className="text-[10px] font-mono text-violet-300 border border-violet-800/40 bg-violet-900/20 px-2 py-0.5 rounded-full animate-pulse">{stats.running} running</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={() => router.push('/builder')}
              className="flex items-center gap-1.5 text-[11px] bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              <Plus size={12} /> New Pipeline
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          {[
            { label: 'Total', value: stats.total, icon: Activity, color: 'text-zinc-400' },
            { label: 'Running', value: stats.running, icon: Loader2, color: 'text-violet-400' },
            { label: 'Passing', value: stats.passing, icon: CheckCircle2, color: 'text-emerald-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#111113] border border-[#27272A] rounded-xl p-3 flex items-center gap-3">
              <Icon size={16} className={color} />
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
                <div className="text-xl font-bold text-zinc-100 font-mono">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="shrink-0 max-w-sm">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search pipelines..." />
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 bg-[#111113] border border-[#27272A] rounded-xl overflow-hidden flex flex-col">
          <div className="h-9 px-4 border-b border-[#27272A] flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 bg-[#18181B]/40">
            <span className="flex-1">Pipeline</span>
            <span className="w-28">Repository</span>
            <span className="w-24 text-right">Success Rate</span>
            <span className="w-24 text-right">Last Run</span>
            <span className="w-20 text-right">Status</span>
            <span className="w-24"></span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <SkeletonTableRows rows={6} cols={5} />
            ) : paginated.length === 0 ? (
              <EmptyState
                icon={<GitBranch size={32} />}
                title="No pipelines found"
                description="Create your first pipeline from the Builder"
                action={
                  <button onClick={() => router.push('/builder')} className="text-xs text-violet-400 hover:text-violet-300 border border-violet-800/40 px-3 py-1.5 rounded-lg transition-colors">
                    Open Builder
                  </button>
                }
              />
            ) : (
              paginated.map(p => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/runs?pipelineId=${p.id}`)}
                  className="h-14 px-4 border-b border-[#27272A]/60 flex items-center gap-4 text-xs cursor-pointer hover:bg-[#18181B]/35 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-200 group-hover:text-white truncate">{p.name}</div>
                    {p.branch && (
                      <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 mt-0.5">
                        <GitBranch size={9} /> {p.branch}
                      </div>
                    )}
                  </div>

                  <div className="w-28 text-[10px] font-mono text-zinc-400 truncate">
                    {p.repositoryUrl?.replace('https://github.com/', '') ?? '—'}
                  </div>

                  <div className="w-24 text-right">
                    {p.successRate !== undefined ? (
                      <span className={`text-[11px] font-bold font-mono ${p.successRate >= 80 ? 'text-emerald-400' : p.successRate >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {p.successRate.toFixed(0)}%
                      </span>
                    ) : <span className="text-zinc-600">—</span>}
                  </div>

                  <div className="w-24 text-right font-mono text-[10px] text-zinc-500 flex items-center justify-end gap-1">
                    <Clock size={10} /> {timeAgo(p.lastRunAt)}
                  </div>

                  <div className="w-20 flex justify-end">
                    <StatusPill status={p.status ?? 'queued'} />
                  </div>

                  <div className="w-24 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleTrigger(p)}
                      disabled={triggering === p.id}
                      className="flex items-center gap-1 text-[10px] font-semibold text-white bg-violet-600 hover:bg-violet-500 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {triggering === p.id ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
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
