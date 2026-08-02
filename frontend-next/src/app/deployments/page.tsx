'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  Rocket, RefreshCw, RotateCcw, Globe, Clock, CheckCircle2,
  XCircle, AlertTriangle, Loader2, History, ExternalLink,
} from 'lucide-react';
import { listDeployments, rollbackDeployment, Deployment } from '@/lib/apiClient';
import { SkeletonTableRows, EmptyState, StatusPill, SearchInput, ConfirmDialog } from '@/components/ui/Primitives';
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

const ENV_ORDER = ['production', 'staging', 'preview', 'development'];

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rollbackTarget, setRollbackTarget] = useState<Deployment | null>(null);
  const [rolling, setRolling] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDeployments();
      setDeployments(res.data ?? []);
    } catch {
      toast({ kind: 'error', title: 'Failed to load deployments' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    setRolling(rollbackTarget.id);
    setRollbackTarget(null);
    try {
      await rollbackDeployment(rollbackTarget.id);
      toast({ kind: 'success', title: 'Rollback initiated', message: `${rollbackTarget.environment} → previous version` });
      load();
    } catch {
      toast({ kind: 'error', title: 'Rollback failed' });
    } finally {
      setRolling(null);
    }
  };

  const filtered = deployments.filter(d =>
    !search || (d.environment + (d.version ?? '') + (d.imageTag ?? '')).toLowerCase().includes(search.toLowerCase())
  );

  const byEnv = ENV_ORDER.map(env => ({
    env,
    deployments: filtered.filter(d => (d.environment ?? '').toLowerCase() === env),
  })).filter(g => g.deployments.length > 0);

  // Add any environments not in the order list
  const knownEnvs = new Set(ENV_ORDER);
  const otherEnvs = [...new Set(filtered.map(d => d.environment ?? 'unknown').filter(e => !knownEnvs.has(e)))];
  otherEnvs.forEach(env => byEnv.push({ env, deployments: filtered.filter(d => (d.environment ?? 'unknown') === env) }));

  const stats = {
    total: deployments.length,
    active: deployments.filter(d => d.status === 'ACTIVE').length,
    failed: deployments.filter(d => d.status === 'FAILED').length,
    rolledBack: deployments.filter(d => d.status === 'ROLLED_BACK').length,
  };

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">

        {/* Header */}
        <div className="h-14 px-4 rounded-xl bg-[#111113] border border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Rocket size={16} className="text-violet-400" />
            <h1 className="text-sm font-bold text-zinc-100">Deployments</h1>
            <span className="text-[10px] font-mono text-zinc-500 border border-[#27272A] px-2 py-0.5 rounded-full">{stats.total} total</span>
            {stats.active > 0 && (
              <span className="text-[10px] font-mono text-emerald-300 border border-emerald-800/40 bg-emerald-900/20 px-2 py-0.5 rounded-full">{stats.active} active</span>
            )}
            {stats.failed > 0 && (
              <span className="text-[10px] font-mono text-rose-300 border border-rose-800/40 bg-rose-900/20 px-2 py-0.5 rounded-full">{stats.failed} failed</span>
            )}
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 shrink-0">
          {[
            { label: 'Total', value: stats.total, color: 'text-zinc-400' },
            { label: 'Active', value: stats.active, color: 'text-emerald-400' },
            { label: 'Failed', value: stats.failed, color: 'text-rose-400' },
            { label: 'Rolled Back', value: stats.rolledBack, color: 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#111113] border border-[#27272A] rounded-xl p-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
              <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="shrink-0 max-w-sm">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by environment, version..." />
        </div>

        {/* Deployment groups */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          {loading ? (
            <div className="bg-[#111113] border border-[#27272A] rounded-xl overflow-hidden">
              <SkeletonTableRows rows={4} cols={5} />
            </div>
          ) : byEnv.length === 0 ? (
            <div className="bg-[#111113] border border-[#27272A] rounded-xl">
              <EmptyState
                icon={<Rocket size={32} />}
                title="No deployments yet"
                description="Deployments are created when a pipeline run completes successfully"
              />
            </div>
          ) : (
            byEnv.map(({ env, deployments: envDeps }) => (
              <div key={env} className="bg-[#111113] border border-[#27272A] rounded-xl overflow-hidden">
                <div className="h-9 px-4 border-b border-[#27272A] flex items-center gap-2 bg-[#18181B]/40">
                  <Globe size={12} className="text-zinc-500" />
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">{env}</span>
                  <span className="text-[10px] text-zinc-600 font-mono">{envDeps.length} deployment{envDeps.length !== 1 ? 's' : ''}</span>
                </div>

                {envDeps.map(d => (
                  <div key={d.id} className="h-16 px-4 border-b border-[#27272A]/50 last:border-0 flex items-center gap-4 text-xs group hover:bg-[#18181B]/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200">{d.version ?? d.imageTag ?? d.id.slice(0, 8)}</span>
                        {d.url && (
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300" onClick={e => e.stopPropagation()}>
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                      {d.imageTag && d.version !== d.imageTag && (
                        <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{d.imageTag}</div>
                      )}
                    </div>

                    <div className="w-28 text-right">
                      <StatusPill status={d.health ?? d.status ?? 'pending'} />
                    </div>

                    <div className="w-32 text-right font-mono text-[10px] text-zinc-500 flex items-center justify-end gap-1">
                      <Clock size={10} /> {timeAgo(d.deployedAt)}
                    </div>

                    <div className="w-36 flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                      {d.pipelineRunId && (
                        <button
                          onClick={() => router.push(`/runs/${d.pipelineRunId}`)}
                          className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 border border-[#27272A] px-2 py-1 rounded-lg transition-colors"
                        >
                          <History size={10} /> Logs
                        </button>
                      )}
                      <button
                        onClick={() => setRollbackTarget(d)}
                        disabled={rolling === d.id || d.status === 'ROLLED_BACK'}
                        className="flex items-center gap-1 text-[10px] font-semibold text-amber-300 hover:text-amber-200 border border-amber-800/40 bg-amber-900/10 px-2 py-1 rounded-lg transition-colors disabled:opacity-30"
                      >
                        {rolling === d.id ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                        Rollback
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <ConfirmDialog
          open={!!rollbackTarget}
          title="Confirm Rollback"
          message={`Are you sure you want to rollback the deployment in environment "${rollbackTarget?.environment}"? This will redeploy the previous stable version.`}
          confirmLabel="Rollback"
          danger
          onConfirm={handleRollback}
          onCancel={() => setRollbackTarget(null)}
        />
      </div>
    </DeveloperShell>
  );
}
