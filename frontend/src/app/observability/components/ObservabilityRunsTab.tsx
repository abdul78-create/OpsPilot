'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  GitBranch, Clock, CheckCircle2, XCircle, ArrowRight,
  Search, Filter, Play, RefreshCw, AlertCircle
} from 'lucide-react';
import { PipelineRun } from '@/lib/apiClient';

interface ObservabilityRunsTabProps {
  runs: PipelineRun[];
  onSelectRun: (run: PipelineRun) => void;
  selectedRunId?: string;
}

export const ObservabilityRunsTab: React.FC<ObservabilityRunsTabProps> = ({
  runs,
  onSelectRun,
  selectedRunId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'RUNNING' | 'FAILED'>('ALL');

  const filteredRuns = runs.filter((run) => {
    if (statusFilter !== 'ALL' && run.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchBranch = run.branch?.toLowerCase().includes(q);
      const matchCommit = run.commitSha?.toLowerCase().includes(q);
      const matchPipeline = run.pipelineName?.toLowerCase().includes(q);
      const matchId = run.id.toLowerCase().includes(q);
      if (!matchBranch && !matchCommit && !matchPipeline && !matchId) return false;
    }
    return true;
  });

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
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by branch, commit, pipeline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[var(--surface-secondary)] p-1 rounded-lg border border-[var(--border-subtle)]">
          {(['ALL', 'SUCCESS', 'RUNNING', 'FAILED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === st
                  ? 'bg-[var(--surface-primary)] text-indigo-500 shadow-xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Runs Table / List */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm">
        {filteredRuns.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">
            No pipeline runs matching criteria.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {filteredRuns.map((run) => {
              const isSelected = selectedRunId === run.id;
              const isSuccess = run.status === 'SUCCESS';
              const isRunning = run.status === 'RUNNING';
              const isFailed = run.status === 'FAILED';

              return (
                <div
                  key={run.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isSelected
                      ? 'bg-indigo-500/5'
                      : 'hover:bg-[var(--surface-secondary)]/50'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="pt-0.5">
                      {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {isRunning && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
                      {isFailed && <XCircle className="w-4 h-4 text-rose-500" />}
                      {!isSuccess && !isRunning && !isFailed && <Clock className="w-4 h-4 text-slate-400" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--text-primary)]">
                          {run.pipelineName || 'Delivery Pipeline'}
                        </span>
                        <span className="font-mono text-xs text-indigo-500">#{run.id.slice(0, 8)}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1 font-mono bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-primary)]">
                          <GitBranch className="w-3 h-3 text-[var(--text-muted)]" />
                          {run.branch || 'main'}
                        </span>
                        <span className="font-mono">
                          {run.commitSha ? run.commitSha.slice(0, 7) : 'latest'}
                        </span>
                        <span>·</span>
                        <span>{run.triggerType === 'GIT_PUSH' ? 'GitHub Push' : run.triggerType || 'Manual'}</span>
                        <span>·</span>
                        <span>{formatTimestamp(run.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-xs font-mono font-medium text-[var(--text-primary)]">
                        {run.durationSeconds ? `${run.durationSeconds}s` : isRunning ? 'Running...' : '-'}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">Duration</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectRun(run)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                      >
                        Inspect in Live View
                      </button>

                      <Link
                        href={`/runs/${run.id}`}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors border border-[var(--border-subtle)]"
                        title="View Full Run Details"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
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
