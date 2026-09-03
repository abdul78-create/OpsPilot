'use client';

import React from 'react';
import Link from 'next/link';
import {
  Rocket, CheckCircle2, XCircle, Clock, ExternalLink,
  Shield, ArrowUpRight, RotateCcw
} from 'lucide-react';
import { Deployment } from '@/lib/apiClient';

interface ObservabilityDeploymentsTabProps {
  deployments: Deployment[];
}

export const ObservabilityDeploymentsTab: React.FC<ObservabilityDeploymentsTabProps> = ({
  deployments,
}) => {
  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Deployment Releases</h3>
          <p className="text-xs text-[var(--text-muted)]">Real-time delivery state across environments</p>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-500/10 text-[var(--text-muted)] border border-[var(--border-subtle)]">
          {deployments.length} Total Releases
        </span>
      </div>

      {deployments.length === 0 ? (
        <div className="py-16 text-center text-xs text-[var(--text-muted)]">
          No deployments recorded yet. Releases promoted to an environment will appear here.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {deployments.map((dep) => {
            const isSuccess = dep.status === 'SUCCESS';
            const isFailed = dep.status === 'FAILED';
            const isProgress = dep.status === 'IN_PROGRESS';

            return (
              <div
                key={dep.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--surface-secondary)]/40 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="pt-0.5">
                    {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {isFailed && <XCircle className="w-4 h-4 text-rose-500" />}
                    {isProgress && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[var(--text-primary)]">
                        {dep.environment || 'Staging'}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[var(--surface-secondary)] text-indigo-500 border border-[var(--border-subtle)] font-medium">
                        {dep.version || dep.imageTag || 'v1.0.0'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)]">
                      <span>Deployed {formatTimestamp(dep.deployedAt)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${dep.health === 'HEALTHY' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        Health: {dep.health || 'HEALTHY'}
                      </span>
                      {dep.url && (
                        <>
                          <span>·</span>
                          <a
                            href={dep.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-500 hover:underline flex items-center gap-0.5"
                          >
                            Live URL <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                    isSuccess
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : isFailed
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                      : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                  }`}>
                    {dep.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
