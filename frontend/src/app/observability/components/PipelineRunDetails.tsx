'use client';

import React from 'react';
import { CheckCircle2, Clock, GitBranch, GitCommit, ArrowRight, XCircle, AlertTriangle } from 'lucide-react';
import { PipelineRun } from '@/lib/apiClient';
import Link from 'next/link';

interface PipelineRunDetailsProps {
  activeRun: PipelineRun | null;
}

export const PipelineRunDetails: React.FC<PipelineRunDetailsProps> = ({ activeRun }) => {
  if (!activeRun) {
    return (
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Pipeline Run</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-500/10 text-[var(--text-muted)] border border-slate-500/20">
              IDLE
            </span>
          </div>
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">
            No run selected or active.
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = activeRun.status === 'SUCCESS';
  const isRunning = activeRun.status === 'RUNNING';
  const isFailed = activeRun.status === 'FAILED';

  const formatStartedTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getRepoName = (repoUrl?: string) => {
    if (!repoUrl) return 'Connected Repository';
    return repoUrl.replace('https://github.com/', '').replace('.git', '');
  };

  return (
    <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header with status badge */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Pipeline Run</h2>
          <div className="flex items-center gap-1.5">
            {isSuccess && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                SUCCESS
              </span>
            )}
            {isRunning && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-500 border border-blue-500/30 animate-pulse">
                <Clock className="w-3 h-3 animate-spin" />
                RUNNING
              </span>
            )}
            {isFailed && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-rose-500/10 text-rose-500 border border-rose-500/30">
                <XCircle className="w-3 h-3" />
                FAILED
              </span>
            )}
            {!isSuccess && !isRunning && !isFailed && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-500/10 text-[var(--text-muted)] border border-slate-500/20">
                {activeRun.status}
              </span>
            )}
          </div>
        </div>

        {/* Metadata Details */}
        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Started</span>
            <span className="text-[var(--text-primary)] font-medium">{formatStartedTime(activeRun.startedAt || activeRun.createdAt)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Duration</span>
            <span className="font-mono text-[var(--text-primary)] font-medium">
              {activeRun.durationSeconds ? `${activeRun.durationSeconds}s` : isRunning ? 'Calculating...' : '-'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Triggered by</span>
            <span className="text-[var(--text-primary)] font-medium">
              {activeRun.triggerType === 'GIT_PUSH' ? 'GitHub Push' : activeRun.triggerType || 'Manual Trigger'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Repository</span>
            <span className="font-mono text-[var(--text-primary)] font-medium truncate max-w-[160px]" title={activeRun.repositoryUrl}>
              {getRepoName(activeRun.repositoryUrl)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Branch</span>
            <span className="font-mono bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-primary)]">
              {activeRun.branch || 'main'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Commit</span>
            <span className="font-mono text-[var(--text-primary)] font-medium">
              {activeRun.commitSha ? activeRun.commitSha.slice(0, 7) : 'latest'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Pipeline</span>
            <span className="text-[var(--text-primary)] font-medium truncate max-w-[160px]" title={activeRun.pipelineName}>
              {activeRun.pipelineName || 'Delivery Pipeline'}
            </span>
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
        <Link
          href={`/runs/${activeRun.id}`}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-500 hover:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-lg border border-indigo-500/20 transition-colors"
        >
          View Full Run Details
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
