'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  Rocket, RefreshCw, RotateCcw, Globe, Clock, Loader2, ExternalLink,
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

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

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

  const knownEnvs = new Set(ENV_ORDER);
  const otherEnvs = [...new Set(filtered.map(d => d.environment ?? 'unknown').filter(e => !knownEnvs.has(e)))];
  otherEnvs.forEach(env => byEnv.push({ env, deployments: filtered.filter(d => (d.environment ?? 'unknown') === env) }));

  const stats = {
    total: deployments.length,
    active: deployments.filter(d => d.status === 'ACTIVE').length,
    failed: deployments.filter(d => d.status === 'FAILED').length,
  };

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-4 max-w-7xl mx-auto w-full">

        {/* Header */}
        <div className="h-14 px-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--accent)]">
              <Rocket size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-[var(--text-primary)]">Deployments</h1>
                <span className="text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-full">{stats.total} total</span>
                {stats.active > 0 && (
                  <span className="text-[10px] font-mono text-[var(--success)] border border-[var(--border)] bg-[var(--success-dim)] px-2 py-0.5 rounded-full font-semibold">● {stats.active} active</span>
                )}
                {stats.failed > 0 && (
                  <span className="text-[10px] font-mono text-[var(--error)] border border-[var(--border)] bg-[var(--error-dim)] px-2 py-0.5 rounded-full font-semibold">● {stats.failed} failed</span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">Multi-environment cluster rollouts, versions & instant rollback</p>
            </div>
          </div>

          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-all"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder="Filter environments, versions, or image tags..." />
        </div>

        {/* List by Environment */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5">
              <SkeletonTableRows rows={4} cols={4} />
            </div>
          ) : byEnv.length === 0 ? (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
              <EmptyState icon={<Rocket size={32} />} title="No active deployments" description="Trigger a production pipeline from the Builder to release your first deployment version." />
            </div>
          ) : (
            byEnv.map(({ env, deployments: envDeps }) => (
              <div key={env} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                <div className="h-11 px-5 bg-[var(--bg-tertiary)] border-b border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Globe size={14} className="text-[var(--accent)]" />
                    <span className="text-xs font-bold text-[var(--text-primary)] capitalize">{env} Environment</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)]">
                      {envDeps.length} {envDeps.length === 1 ? 'release' : 'releases'}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-[var(--border)]">
                  {envDeps.map(dep => (
                    <div key={dep.id} className="p-4 px-5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors">
                      <div className="flex items-center gap-4">
                        <StatusPill status={dep.status?.toLowerCase() ?? 'active'} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--text-primary)] font-mono">{dep.version ?? dep.imageTag ?? dep.id}</span>
                            {dep.url && (
                              <a href={dep.url} target="_blank" rel="noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                            <span>Tag: {dep.imageTag ?? 'latest'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock size={11} /> Deployed {timeAgo(dep.deployedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {dep.status === 'ACTIVE' && (
                          <button
                            onClick={() => setRollbackTarget(dep)}
                            disabled={rolling === dep.id}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--error)] bg-[var(--error-dim)] hover:opacity-85 border border-[var(--error)] px-3 py-1.5 rounded-xl transition-all disabled:opacity-40 shadow-sm"
                          >
                            {rolling === dep.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                            Rollback
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <ConfirmDialog
          open={!!rollbackTarget}
          title="Confirm Rollback"
          message={`Rollback ${rollbackTarget?.environment} environment to the previous healthy image version?`}
          onConfirm={handleRollback}
          onCancel={() => setRollbackTarget(null)}
          confirmLabel="Rollback Environment"
          danger
        />
      </div>
    </DeveloperShell>
  );
}
