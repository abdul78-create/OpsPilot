'use client';

import React, { useState } from 'react';
import {
  Activity, AlertCircle, CheckCircle2, XCircle, Clock,
  Terminal, Shield, GitBranch, ArrowRight, Zap, GitPullRequest,
  ExternalLink, FileCode
} from 'lucide-react';
import { PipelineRun, AiAnalysisReport, analyzeRun, applyAiFix } from '@/lib/apiClient';
import Link from 'next/link';

interface ObservabilitySageModeProps {
  run: PipelineRun | null;
  onReportGenerated: (report: AiAnalysisReport) => void;
}

export const ObservabilitySageMode: React.FC<ObservabilitySageModeProps> = ({
  run,
  onReportGenerated,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<AiAnalysisReport | null>(null);
  const [fixResult, setFixResult] = useState<any | null>(null);
  const [applyingFix, setApplyingFix] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!run) {
    return (
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-3">
          <Activity className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">No Execution Run Selected</h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">
          Select a pipeline execution run from the context selector to analyze logs, telemetry, or failures with Observability Sage.
        </p>
        <div className="mt-5">
          <Link
            href="/observability"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors"
          >
            Open Observability Center
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const isFailed = run.status === 'FAILED';
  const isSuccess = run.status === 'SUCCESS';
  const isRunning = run.status === 'RUNNING';

  const handleAnalyzeFailure = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await analyzeRun(run.id);
      setReport(res.data);
      onReportGenerated(res.data);
    } catch (err) {
      setError((err as Error).message || 'Failed to trigger AI Root Cause Analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyFix = async () => {
    if (!report?.id) return;
    setApplyingFix(true);
    setError(null);
    try {
      const res = await applyAiFix(report.id);
      setFixResult(res.data);
    } catch (err) {
      setError((err as Error).message || 'Failed to prepare automated fix branch.');
    } finally {
      setApplyingFix(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Run Telemetry Card ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isFailed ? 'bg-rose-500/10 text-rose-500' : isSuccess ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
            }`}>
              {isFailed && <XCircle className="w-5 h-5" />}
              {isSuccess && <CheckCircle2 className="w-5 h-5" />}
              {isRunning && <Clock className="w-5 h-5 animate-spin" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Execution Run #{run.id.slice(0, 8)}
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                  isSuccess
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : isFailed
                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                    : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                }`}>
                  {run.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
                <span className="font-mono bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                  {run.branch || 'main'}
                </span>
                <span>·</span>
                <span className="font-mono">{run.commitSha ? run.commitSha.slice(0, 7) : 'latest'}</span>
                <span>·</span>
                <span>{run.triggerType}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/observability"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]/80 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              Live Logs
            </Link>

            <button
              onClick={handleAnalyzeFailure}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Analyzing Execution...' : 'Analyze Run RCA'}
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Execution Duration</div>
            <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1">
              {run.durationSeconds ? `${run.durationSeconds}s` : isRunning ? 'active' : '-'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Triggered By</div>
            <div className="text-base font-semibold text-[var(--text-primary)] mt-1">
              {run.triggerType === 'GIT_PUSH' ? 'GitHub Push' : run.triggerType}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Target Container</div>
            <div className="text-base font-semibold text-[var(--text-primary)] mt-1">
              Docker Runner
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Artifacts Generated</div>
            <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {isSuccess ? 'SHA-256 Verified' : 'None (Halted)'}
            </div>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── RCA Report Display ── */}
      {report && (
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${report.riskLevel === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'}`} />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                AI Root Cause Analysis Report
              </h3>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              Confidence: {Math.round(report.confidenceScore * 100)}%
            </span>
          </div>

          {/* Root cause box */}
          <div className="p-3.5 rounded-lg bg-rose-500/5 border border-rose-500/20 text-xs space-y-1">
            <div className="font-semibold text-rose-600 dark:text-rose-400">Identified Root Cause:</div>
            <div className="text-[var(--text-primary)] font-medium leading-relaxed">
              {report.rootCause || report.summary}
            </div>
          </div>

          {/* Recommendations list */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--text-secondary)]">Recommended Fix Steps:</div>
            {(Array.isArray(report.recommendations) ? report.recommendations : []).map((rec, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]"
              >
                <span className="text-indigo-500 font-bold">0{idx + 1}</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <button
              onClick={handleApplyFix}
              disabled={applyingFix}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              {applyingFix ? 'Preparing Fix Branch...' : 'Prepare Automated Fix Proposal'}
            </button>

            <Link
              href={`/runs/${run.id}`}
              className="text-xs font-medium text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
            >
              Inspect Full Run Telemetry
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Fix Proposal Result */}
          {fixResult && (
            <div className="p-4 rounded-lg bg-[var(--surface-secondary)] border border-emerald-500/30 space-y-2 text-xs">
              <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Fix proposal prepared on branch: {fixResult.fixBranch}
              </div>
              <div className="text-[11px] font-mono text-[var(--text-muted)]">
                Retest: {fixResult.reTestInstructions}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
