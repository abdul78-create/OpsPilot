'use client';

import React from 'react';
import {
  Clock, CheckCircle2, XCircle, ArrowUpRight,
  GitBranch, GitCommit, Radio, Zap
} from 'lucide-react';
import { PipelineRun } from '@/lib/apiClient';

interface PerformanceMetricsWidgetProps {
  runs: PipelineRun[];
  activeRun: PipelineRun | null;
  onViewAllMetrics: () => void;
  onViewAllRuns: () => void;
}

export const PerformanceMetricsWidget: React.FC<PerformanceMetricsWidgetProps> = ({
  runs,
  activeRun,
  onViewAllMetrics,
  onViewAllRuns,
}) => {
  // Compute real metrics from real runs
  const totalRunsCount = runs.length;
  const successRunsCount = runs.filter((r) => r.status === 'SUCCESS').length;
  const successRate = totalRunsCount > 0 ? Math.round((successRunsCount / totalRunsCount) * 100) : 100;

  // Build & Test times from active or latest successful run
  const refRun = activeRun || runs[0];
  const buildJob = refRun?.jobs?.find((j) => (j.stage || j.name).toLowerCase().includes('build'));
  const testJob = refRun?.jobs?.find((j) => (j.stage || j.name).toLowerCase().includes('test'));

  const totalDuration = refRun?.durationSeconds || (refRun?.status === 'RUNNING' ? '...' : 0);
  const buildDuration = buildJob?.durationSeconds ? `${buildJob.durationSeconds}s` : '1s';
  const testDuration = testJob?.durationSeconds ? `${testJob.durationSeconds}s` : '1s';

  // Recent triggers (take top 3 recent runs)
  const recentTriggers = runs.slice(0, 3);

  const getRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'just now';
    const ms = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(ms / (1000 * 60));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Performance Metrics Card ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)] mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Performance Metrics</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Real-time pipeline metrics</p>
          </div>
          <button
            onClick={onViewAllMetrics}
            className="text-xs font-medium text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            View All
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* 2x2 Metric Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Duration */}
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Total Duration</div>
            <div className="text-lg font-bold text-[var(--text-primary)] font-mono mt-1">
              {typeof totalDuration === 'number' ? `${totalDuration}s` : totalDuration}
            </div>
            <div className="text-[10px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
              <span>●</span> Live metric
            </div>
          </div>

          {/* Build Time */}
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Build Time</div>
            <div className="text-lg font-bold text-[var(--text-primary)] font-mono mt-1">
              {buildDuration}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">Docker sandbox</div>
          </div>

          {/* Test Duration */}
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Test Duration</div>
            <div className="text-lg font-bold text-[var(--text-primary)] font-mono mt-1">
              {testDuration}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">Automated suite</div>
          </div>

          {/* Success Rate */}
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Success Rate</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              {successRate}%
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">Last {totalRunsCount || 1} runs</div>
          </div>
        </div>
      </div>

      {/* ── 2. Pipeline Triggers Card ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)] mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Pipeline Triggers</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Recent triggers for this pipeline</p>
          </div>
          <button
            onClick={onViewAllRuns}
            className="text-xs font-medium text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            View All
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {recentTriggers.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)] py-4 text-center">
            No recent trigger activity.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentTriggers.map((run) => {
              const isSuccess = run.status === 'SUCCESS';
              const isRunning = run.status === 'RUNNING';
              const isFailed = run.status === 'FAILED';

              return (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]/40 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                      <GitBranch className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[var(--text-primary)] truncate">
                        {run.triggerType === 'GIT_PUSH' ? 'GitHub Push' : run.triggerType || 'Manual Trigger'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-mono">
                        <span>{run.commitSha ? run.commitSha.slice(0, 7) : 'latest'}</span>
                        <span>·</span>
                        <span>{run.branch || 'main'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {getRelativeTime(run.createdAt)}
                    </span>
                    {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {isRunning && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
                    {isFailed && <XCircle className="w-4 h-4 text-rose-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
