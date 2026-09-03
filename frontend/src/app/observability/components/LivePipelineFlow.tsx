'use client';

import React from 'react';
import {
  GitBranch, Box, CheckCircle2, XCircle, Clock,
  AlertCircle, Shield, Rocket, Terminal, Radio,
  Sparkles, RefreshCw, Layers
} from 'lucide-react';
import { PipelineRun, PipelineJob } from '@/lib/apiClient';

interface LivePipelineFlowProps {
  activeRun: PipelineRun | null;
  selectedStageId: string | null;
  onSelectStage: (stageId: string | null) => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  isConnected: boolean;
}

export const LivePipelineFlow: React.FC<LivePipelineFlowProps> = ({
  activeRun,
  selectedStageId,
  onSelectStage,
  autoRefresh,
  onToggleAutoRefresh,
  isConnected,
}) => {
  if (!activeRun) {
    return (
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Live Pipeline Flow</h2>
            <p className="text-xs text-[var(--text-muted)]">Real-time visualization of pipeline execution</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleAutoRefresh}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)]'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              Auto Refresh
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-[var(--text-muted)] border border-slate-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Idle
            </div>
          </div>
        </div>

        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3 text-indigo-500">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">No active executions</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1">
            OpsPilot is currently waiting for the next trigger. New executions will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  // Derive stage nodes from actual jobs
  const jobs: PipelineJob[] = activeRun.jobs && activeRun.jobs.length > 0
    ? activeRun.jobs
    : [
        {
          id: 'job_build',
          name: 'Build Source & Assets',
          stage: 'build',
          status: activeRun.status === 'RUNNING' ? 'RUNNING' : activeRun.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
          durationSeconds: activeRun.durationSeconds ? Math.max(1, Math.floor(activeRun.durationSeconds / 3)) : 1,
        },
        {
          id: 'job_test',
          name: 'Unit & Integration Tests',
          stage: 'test',
          status: activeRun.status === 'RUNNING' ? 'QUEUED' : activeRun.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
          durationSeconds: activeRun.durationSeconds ? Math.max(1, Math.floor(activeRun.durationSeconds / 3)) : 1,
        },
        {
          id: 'job_deploy',
          name: 'Deploy Artifacts',
          stage: 'deploy',
          status: activeRun.status === 'SUCCESS' ? 'SUCCESS' : 'QUEUED',
          durationSeconds: activeRun.durationSeconds ? Math.max(1, Math.floor(activeRun.durationSeconds / 3)) : 1,
        },
      ];

  // Helper for stage icon
  const getStageIcon = (stageName: string, stageType?: string) => {
    const s = (stageType || stageName).toLowerCase();
    if (s.includes('source') || s.includes('clone') || s.includes('checkout')) {
      return <GitBranch className="w-5 h-5" />;
    }
    if (s.includes('build') || s.includes('compile') || s.includes('asset')) {
      return <Box className="w-5 h-5" />;
    }
    if (s.includes('test') || s.includes('lint') || s.includes('check')) {
      return <Terminal className="w-5 h-5" />;
    }
    if (s.includes('security') || s.includes('sast') || s.includes('audit')) {
      return <Shield className="w-5 h-5" />;
    }
    if (s.includes('deploy') || s.includes('release')) {
      return <Rocket className="w-5 h-5" />;
    }
    return <Layers className="w-5 h-5" />;
  };

  const getStageTypeLabel = (stageName: string, stageType?: string) => {
    const s = (stageType || stageName).toLowerCase();
    if (s.includes('source') || s.includes('checkout')) return 'GitHub';
    if (s.includes('build')) return 'Docker';
    if (s.includes('test')) return 'Tests';
    if (s.includes('security')) return 'SAST Scan';
    if (s.includes('deploy')) return 'Staging';
    return stageType || 'Stage';
  };

  return (
    <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Live Pipeline Flow</h2>
          <p className="text-xs text-[var(--text-muted)]">Real-time visualization of pipeline execution</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleAutoRefresh}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)]'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            Auto Refresh
          </button>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {isConnected ? 'Live' : 'Connecting'}
          </div>
        </div>
      </div>

      {/* Stage Flow Nodes */}
      <div className="overflow-x-auto py-2">
        <div className="flex items-center justify-between min-w-[620px] gap-3">
          {/* Source node (Synthesized trigger/source) */}
          <div
            onClick={() => onSelectStage(selectedStageId === 'stage_source' ? null : 'stage_source')}
            className={`flex-1 relative cursor-pointer rounded-xl p-3.5 border transition-all ${
              selectedStageId === 'stage_source'
                ? 'bg-indigo-500/10 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                : 'bg-[var(--surface-secondary)] border-[var(--border-subtle)] hover:border-indigo-500/50'
            }`}
          >
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-sm">
              ✓
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                <GitBranch className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--text-primary)] truncate">Source</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">GitHub</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--text-muted)] border-t border-[var(--border-subtle)]/60 pt-2">
              <span>Duration</span>
              <span className="font-mono font-medium">1s</span>
            </div>
          </div>

          {/* Connection arrow */}
          <div className="w-4 flex items-center justify-center text-[var(--text-muted)]">
            <span className="text-xs">→</span>
          </div>

          {/* Dynamic Stage Nodes */}
          {jobs.map((job, idx) => {
            const isSelected = selectedStageId === job.id;
            const isRunning = job.status === 'RUNNING';
            const isSuccess = job.status === 'SUCCESS';
            const isFailed = job.status === 'FAILED';
            const isQueued = job.status === 'QUEUED';

            return (
              <React.Fragment key={job.id}>
                <div
                  onClick={() => onSelectStage(isSelected ? null : job.id)}
                  className={`flex-1 relative cursor-pointer rounded-xl p-3.5 border transition-all ${
                    isSelected
                      ? 'bg-indigo-500/10 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                      : isRunning
                      ? 'bg-blue-500/5 border-blue-500/60 shadow-sm ring-1 ring-blue-500/30'
                      : 'bg-[var(--surface-secondary)] border-[var(--border-subtle)] hover:border-indigo-500/50'
                  }`}
                >
                  {/* Status badge pill */}
                  <div className="absolute -top-2 -right-2">
                    {isSuccess && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-sm">
                        ✓
                      </div>
                    )}
                    {isRunning && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] animate-spin shadow-sm">
                        ◌
                      </div>
                    )}
                    {isFailed && (
                      <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] shadow-sm">
                        ✕
                      </div>
                    )}
                    {isQueued && (
                      <div className="w-5 h-5 rounded-full bg-slate-400 text-white flex items-center justify-center text-[10px]">
                        ○
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isRunning
                        ? 'bg-blue-500/15 text-blue-500'
                        : isSuccess
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : isFailed
                        ? 'bg-rose-500/15 text-rose-500'
                        : 'bg-slate-500/10 text-[var(--text-muted)]'
                    }`}>
                      {getStageIcon(job.name, job.stage)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {job.stage ? job.stage.charAt(0).toUpperCase() + job.stage.slice(1) : job.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">
                        {getStageTypeLabel(job.name, job.stage)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--text-muted)] border-t border-[var(--border-subtle)]/60 pt-2">
                    <span>
                      {isRunning ? (
                        <span className="text-blue-500 font-medium animate-pulse">Running</span>
                      ) : isSuccess ? (
                        <span>Success</span>
                      ) : isFailed ? (
                        <span className="text-rose-500">Failed</span>
                      ) : (
                        <span>Queued</span>
                      )}
                    </span>
                    <span className="font-mono font-medium">
                      {job.durationSeconds ? `${job.durationSeconds}s` : isRunning ? '...' : '-'}
                    </span>
                  </div>
                </div>

                {idx < jobs.length - 1 && (
                  <div className="w-4 flex items-center justify-center text-[var(--text-muted)]">
                    <span className="text-xs">→</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Meta Bar */}
      <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-y-2 text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text-secondary)] font-medium">Pipeline:</span>
          <span className="text-[var(--text-primary)] font-semibold">{activeRun.pipelineName || 'Delivery Pipeline'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text-secondary)] font-medium">Run ID:</span>
          <span className="font-mono text-indigo-500 dark:text-indigo-400 font-semibold">#{activeRun.id.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text-secondary)] font-medium">Branch:</span>
          <span className="font-mono text-[var(--text-primary)] bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
            {activeRun.branch || 'main'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text-secondary)] font-medium">Commit:</span>
          <span className="font-mono text-[var(--text-primary)]">
            {activeRun.commitSha ? activeRun.commitSha.slice(0, 7) : 'latest'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text-secondary)] font-medium">Triggered by:</span>
          <span className="text-[var(--text-primary)] font-medium">
            {activeRun.triggerType === 'GIT_PUSH' ? 'GitHub Push' : activeRun.triggerType || 'Manual'}
          </span>
        </div>
      </div>
    </div>
  );
};
