'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  CheckCircle2, XCircle, Loader2, Circle, XSquare,
  ChevronLeft, AlertCircle, ChevronRight,
  GitBranch, GitCommit, Clock, RefreshCw, Sparkles,
} from 'lucide-react';
import {
  getPipelineRun, fetchRunLogs, cancelRun, analyzeRun, formatLogLines,
  PipelineRun, PipelineJob, LogEntry, AiAnalysisReport,
} from '@/lib/apiClient';
import { StatusPill } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';
import { XTermPanel } from '@/components/ui/XTermPanel';
import { TerminalStream } from '@/components/ui/terminal-stream';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractRunIdFromPath(pathname?: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/\/runs\/([^/?#]+)/);
  if (match && match[1] && match[1] !== 'shell') {
    return decodeURIComponent(match[1]);
  }
  return null;
}


function timeAgo(d?: string) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function formatDuration(secs?: number) {
  if (secs === undefined || secs === null) return '—';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function jobStatusIcon(status: PipelineJob['status']) {
  switch (status) {
    case 'SUCCESS':   return <CheckCircle2 size={14} className="shrink-0" style={{ color: 'var(--success)' }} />;
    case 'FAILED':    return <XCircle size={14} className="shrink-0" style={{ color: 'var(--error)' }} />;
    case 'RUNNING':   return <Loader2 size={14} className="animate-spin shrink-0" style={{ color: 'var(--info)' }} />;
    case 'QUEUED':    return <Circle size={14} className="shrink-0" style={{ color: 'var(--warning)' }} />;
    case 'CANCELLED': return <XSquare size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />;
    case 'SKIPPED':   return <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />;
  }
}

// ─── Step Timeline ────────────────────────────────────────────────────────────

function StepTimeline({
  jobs, activeJob, onSelect,
}: { jobs: PipelineJob[]; activeJob: string | null; onSelect: (id: string) => void }) {
  const totalDuration = jobs.reduce((s, j) => s + (j.durationSeconds ?? 0), 0);

  return (
    <div className="flex flex-col gap-0.5">
      {jobs.map((job) => {
        const isActive = activeJob === job.id;
        const pct = totalDuration > 0 ? ((job.durationSeconds ?? 0) / totalDuration) * 100 : 0;
        return (
          <div key={job.id}>
            <button
              onClick={() => onSelect(job.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left group"
              style={{
                background: isActive ? 'var(--bg-secondary)' : 'transparent',
                borderColor: isActive ? 'var(--border)' : 'transparent',
                borderWidth: '1px',
              }}
            >
              {jobStatusIcon(job.status)}
              <div className="flex-1 min-w-0">
                <div
                  className="text-[11px] font-semibold truncate"
                  style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  {job.name}
                </div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {job.stage}
                </div>
              </div>
              <div className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                {formatDuration(job.durationSeconds)}
              </div>
            </button>
            {/* Duration bar */}
            {pct > 0 && (
              <div className="mx-3 h-0.5 rounded overflow-hidden mb-0.5" style={{ background: 'var(--bg-tertiary)' }}>
                <div
                  className="h-full rounded transition-all"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    background: job.status === 'SUCCESS' ? 'var(--success)' : job.status === 'FAILED' ? 'var(--error)' : 'var(--accent)',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Run Detail Page ─────────────────────────────────────────────────────

interface RunDetailPageProps { runId: string; }

export function RunDetailPage({ runId: initialRunId }: RunDetailPageProps) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const getResolvedRunId = useCallback(() => {
    // 1. From useParams if present and not 'shell'
    if (params?.runId && typeof params.runId === 'string' && params.runId !== 'shell') {
      return params.runId;
    }
    // 2. From usePathname()
    const fromPath = extractRunIdFromPath(pathname);
    if (fromPath) return fromPath;
    // 3. From window.location.pathname if client-rendered
    if (typeof window !== 'undefined') {
      const fromWindow = extractRunIdFromPath(window.location.pathname);
      if (fromWindow) return fromWindow;
    }
    // 4. Fallback to initialRunId prop
    return initialRunId;
  }, [params, pathname, initialRunId]);

  const [runId, setRunId] = useState<string>(getResolvedRunId);

  useEffect(() => {
    const current = getResolvedRunId();
    if (current && current !== runId) {
      setRunId(current);
    }
  }, [getResolvedRunId, runId]);

  const [run, setRun] = useState<PipelineRun | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<AiAnalysisReport | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!runId || runId === 'shell') {
      setLoading(false);
      return;
    }
    try {
      const [runRes, logEntries] = await Promise.all([
        getPipelineRun(runId),
        fetchRunLogs(runId),
      ]);
      setRun(runRes.data);
      setLogs(logEntries);
      // Auto-select first failed job, then first running, then first job
      const jobs = runRes.data?.jobs ?? [];
      if (!activeJobId) {
        const failed  = jobs.find(j => j.status === 'FAILED');
        const running = jobs.find(j => j.status === 'RUNNING');
        setActiveJobId(failed?.id ?? running?.id ?? jobs[0]?.id ?? null);
      }
    } catch {
      toast({ kind: 'error', title: 'Failed to load run details' });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, toast]);


  useEffect(() => {
    load();
    // Poll for live runs
    const iv = setInterval(() => {
      if (run?.status === 'RUNNING' || run?.status === 'QUEUED') load();
    }, 5000);
    return () => clearInterval(iv);
  }, [load, run?.status]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelRun(runId);
      toast({ kind: 'success', title: 'Run cancelled' });
      load();
    } catch {
      toast({ kind: 'error', title: 'Cancel failed' });
    } finally {
      setCancelling(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAiError(null);
    try {
      const res = await analyzeRun(runId);
      if (res?.data) {
        setAiReport(res.data);
        toast({ kind: 'success', title: 'AI Root Cause Analysis Complete' });
      } else {
        setAiError('AI Root Cause Analysis unavailable. Configure an AI provider (GEMINI_API_KEY) to enable automated RCA.');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      const isUnconfigured = msg.includes('not configured') || msg.includes('GEMINI_API_KEY');
      const formattedError = isUnconfigured
        ? 'AI Root Cause Analysis unavailable: Configure an AI provider (GEMINI_API_KEY) in environment settings to enable automated RCA.'
        : `AI Root Cause Analysis failed: ${msg || 'AI provider was unreachable or returned an error.'}`;
      setAiError(formattedError);
      toast({
        kind: isUnconfigured ? 'info' : 'warning',
        title: isUnconfigured ? 'AI Provider Not Configured' : 'AI Analysis Failed',
        message: formattedError,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-32 h-4 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
        <div className="flex-1 grid grid-cols-[280px_1fr] gap-3">
          <div className="border rounded-xl animate-pulse" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }} />
          <div className="border rounded-xl animate-pulse" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }} />
        </div>
      </div>
    );
  }

  if (!run || runId === 'shell') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
        <AlertCircle size={32} className="opacity-40" />
        <p className="text-sm">Run not found: <code className="font-mono text-xs">{runId === 'shell' ? 'No run ID specified' : runId}</code></p>
        <button onClick={() => router.push('/runs/')} className="text-xs hover:opacity-80 transition-opacity" style={{ color: 'var(--accent)' }}>
          ← Back to Runs
        </button>
      </div>
    );
  }

  const jobs = run.jobs ?? [];
  const successJobs = jobs.filter(j => j.status === 'SUCCESS').length;
  const isLive = run.status === 'RUNNING' || run.status === 'QUEUED';

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">

      {/* Header */}
      <div
        className="h-14 px-4 rounded-xl border flex items-center gap-3 shrink-0"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => router.push('/runs/')}
          className="flex items-center gap-1 text-[11px] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft size={13} /> Runs
        </button>

        <div className="w-px h-4" style={{ background: 'var(--border)' }} />

        <code className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>{runId}</code>
        <StatusPill status={run.status} />

        {isLive && (
          <span
            className="text-[10px] font-mono border px-2 py-0.5 rounded-full animate-pulse"
            style={{
              background: 'var(--info-dim)',
              borderColor: 'var(--info)',
              color: 'var(--info)',
            }}
          >
            live
          </span>
        )}

        <div className="flex-1" />

        {run.branch && (
          <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <GitBranch size={10} /> {run.branch}
          </span>
        )}
        {run.commitSha && (
          <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <GitCommit size={10} /> {run.commitSha.slice(0, 7)}
          </span>
        )}
        <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <Clock size={10} /> {formatDuration(run.durationSeconds)}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1 text-[11px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw size={12} className={isLive ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-1.5 text-[11px] border px-3 py-1.5 rounded-lg transition-colors font-semibold"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI Analyze
          </button>

          {isLive && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 text-[11px] border px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-semibold"
              style={{
                background: 'var(--error-dim)',
                borderColor: 'var(--error)',
                color: 'var(--error)',
              }}
            >
              {cancelling ? <Loader2 size={12} className="animate-spin" /> : <XSquare size={12} />}
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* AI Root Cause Analysis Report Card — Real Analysis Only */}
      {aiReport && (
        <div
          className="p-4 border rounded-xl text-xs space-y-3 shrink-0"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-bright)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--text-primary)' }}>
              <Sparkles size={15} style={{ color: 'var(--accent)' }} />
              <span>AI Root Cause Analysis (Live LLM Diagnostic)</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-mono border"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                {Math.round((aiReport.confidenceScore ?? 0.95) * 100)}% Confidence
              </span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase border"
                style={{
                  background: aiReport.riskLevel === 'CRITICAL' ? 'var(--error-dim)' : 'var(--warning-dim)',
                  borderColor: aiReport.riskLevel === 'CRITICAL' ? 'var(--error)' : 'var(--warning)',
                  color: aiReport.riskLevel === 'CRITICAL' ? 'var(--error)' : 'var(--warning)',
                }}
              >
                {aiReport.riskLevel ?? 'MEDIUM'} Risk
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{aiReport.summary}</p>
            {aiReport.rootCause && (
              <div
                className="p-2.5 rounded-lg border font-mono text-[11px]"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <strong style={{ color: 'var(--text-primary)' }}>Root Cause:</strong> {aiReport.rootCause}
              </div>
            )}
          </div>

          {Array.isArray(aiReport.recommendations) && aiReport.recommendations.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Recommended Fixes
              </span>
              <ul className="space-y-1">
                {aiReport.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent)' }}>•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* AI Analysis in Progress State */}
      {analyzing && (
        <div
          className="p-3.5 border rounded-xl text-xs flex items-center gap-2.5 shrink-0 animate-pulse"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--accent)',
            color: 'var(--text-primary)',
          }}
        >
          <Loader2 size={15} className="animate-spin text-[var(--accent)] shrink-0" />
          <span>Generating AI Root Cause Analysis from build logs and failure traces…</span>
        </div>
      )}

      {/* AI Error / Unavailable State */}
      {aiError && !aiReport && !analyzing && (
        <div
          className="p-4 border rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="text-[var(--warning)] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[var(--text-primary)]">AI Root Cause Analysis Unavailable</div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{aiError}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                Configure <code className="bg-[var(--bg-tertiary)] px-1 py-0.5 rounded text-[var(--text-primary)]">GEMINI_API_KEY</code> in environment variables to enable automated RCA.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAiError(null)}
            className="text-[10px] underline font-mono cursor-pointer self-start sm:self-center"
            style={{ color: 'var(--text-muted)' }}
          >
            Dismiss
          </button>
        </div>
      )}


      {/* Main layout: Step Timeline + Log Viewer */}
      <div className="flex-1 min-h-0 grid grid-cols-[260px_1fr] gap-3">

        {/* Step Timeline */}
        <div
          className="border rounded-xl flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div
            className="h-9 px-3 border-b flex items-center justify-between shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Steps</span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{successJobs}/{jobs.length} done</span>
          </div>

          {jobs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No steps recorded
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-2">
              <StepTimeline
                jobs={jobs}
                activeJob={activeJobId}
                onSelect={setActiveJobId}
              />
            </div>
          )}

          {/* Run metadata */}
          <div className="border-t p-3 space-y-1.5 shrink-0" style={{ borderColor: 'var(--border)' }}>
            {[
              { label: 'Triggered by', value: run.triggeredBy ?? '—' },
              { label: 'Queued',       value: timeAgo(run.queuedAt) },
              { label: 'Started',      value: timeAgo(run.startedAt) },
              { label: 'Duration',     value: formatDuration(run.durationSeconds) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-[10px]">
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Log Panel */}
        <div
          className="border rounded-2xl overflow-hidden flex flex-col"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          {/* Toolbar */}
          <div
            className="flex items-center gap-2 px-4 py-2 border-b shrink-0"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--error)' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--warning)' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--success)' }} />
            </div>
            <span className="flex-1 text-center text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {isLive ? 'live stream' : `${logs.filter(l => !activeJobId || l.jobId === activeJobId).length} lines`}
            </span>
            {isLive && (
              <span
                className="text-[10px] font-mono border px-2 py-0.5 rounded-md animate-pulse"
                style={{
                  background: 'var(--success-dim)',
                  borderColor: 'var(--success)',
                  color: 'var(--success)',
                }}
              >
                ● streaming
              </span>
            )}
          </div>

          {/* Canvas surface */}
          <div className="flex-1 min-h-0">
            {isLive ? (
              <TerminalStream runId={runId} />
            ) : (
              <XTermPanel
                lines={formatLogLines(
                  activeJobId
                    ? logs.filter(l => l.jobId === activeJobId)
                    : logs
                )}
                stream={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shell Wrapper ────────────────────────────────────────────────────────────

export function DeveloperShellWrapper({ runId }: { runId: string }) {
  return (
    <DeveloperShell>
      <RunDetailPage runId={runId} />
    </DeveloperShell>
  );
}
