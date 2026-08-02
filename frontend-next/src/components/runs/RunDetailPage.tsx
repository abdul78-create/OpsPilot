'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  CheckCircle2, XCircle, Loader2, Circle, XSquare,
  GitBranch, GitCommit, Clock, ChevronLeft, Download,
  RefreshCw, Play, AlertCircle, ChevronDown, ChevronRight,
  Terminal, Sparkles, Copy, RotateCcw,
} from 'lucide-react';
import {
  getPipelineRun, fetchRunLogs, cancelRun, analyzeRun,
  formatLogLines, PipelineRun, PipelineJob, LogEntry,
} from '@/lib/apiClient';
import { StatusPill, CopyButton } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (!secs) return '—';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function pipelineShortName(name?: string) {
  if (!name) return 'Pipeline';
  const m = name.match(/Build:\s*https?:\/\/github\.com\/([^/\s]+\/[^/\s]+)/);
  return m ? m[1] : name;
}

function jobStatusIcon(status: PipelineJob['status']) {
  switch (status) {
    case 'SUCCESS':   return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />;
    case 'FAILED':    return <XCircle size={14} className="text-rose-400 shrink-0" />;
    case 'RUNNING':   return <Loader2 size={14} className="text-blue-400 animate-spin shrink-0" />;
    case 'QUEUED':    return <Circle size={14} className="text-amber-400 shrink-0" />;
    case 'CANCELLED': return <XSquare size={14} className="text-slate-500 shrink-0" />;
    case 'SKIPPED':   return <ChevronRight size={14} className="text-slate-600 shrink-0" />;
  }
}

function logLevelColor(level: string) {
  switch (level) {
    case 'ERROR': return 'text-rose-400';
    case 'WARN':  return 'text-amber-400';
    case 'DEBUG': return 'text-slate-500';
    default:      return 'text-slate-400';
  }
}

// ─── Step Timeline ────────────────────────────────────────────────────────────

function StepTimeline({
  jobs, activeJob, onSelect,
}: { jobs: PipelineJob[]; activeJob: string | null; onSelect: (id: string) => void }) {
  const totalDuration = jobs.reduce((s, j) => s + (j.durationSeconds ?? 0), 0);

  return (
    <div className="flex flex-col gap-0.5">
      {jobs.map((job, i) => {
        const isActive = activeJob === job.id;
        const pct = totalDuration > 0 ? ((job.durationSeconds ?? 0) / totalDuration) * 100 : 0;
        return (
          <div key={job.id}>
            <button
              onClick={() => onSelect(job.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left group ${
                isActive
                  ? 'bg-blue-600/10 border border-blue-500/20'
                  : 'hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              {jobStatusIcon(job.status)}
              <div className="flex-1 min-w-0">
                <div className={`text-[11px] font-semibold truncate ${isActive ? 'text-blue-300' : 'text-slate-200'}`}>
                  {job.name}
                </div>
                <div className="text-[9px] text-slate-600 uppercase tracking-wider">{job.stage}</div>
              </div>
              <div className="text-[10px] font-mono text-slate-500 shrink-0">
                {formatDuration(job.durationSeconds)}
              </div>
            </button>
            {/* Duration bar */}
            {pct > 0 && (
              <div className="mx-3 h-0.5 bg-slate-800 rounded overflow-hidden mb-0.5">
                <div
                  className={`h-full rounded transition-all ${
                    job.status === 'SUCCESS' ? 'bg-emerald-500/50'
                    : job.status === 'FAILED' ? 'bg-rose-500/50'
                    : job.status === 'RUNNING' ? 'bg-blue-500/50 animate-pulse'
                    : 'bg-slate-700'
                  }`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Log Viewer ───────────────────────────────────────────────────────────────

function LogViewer({ logs, jobId }: { logs: LogEntry[]; jobId: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const jobLogs = jobId ? logs.filter(l => l.jobId === jobId) : logs;
  const filtered = !search ? jobLogs : jobLogs.filter(l =>
    l.message.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filtered, autoScroll]);

  const copyAll = async () => {
    await navigator.clipboard.writeText(filtered.map(l => `[${l.level}] ${l.message}`).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadLogs = () => {
    const blob = new Blob([filtered.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `run-logs-${jobId ?? 'all'}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 shrink-0">
        <Terminal size={12} className="text-slate-500" />
        <span className="text-[10px] text-slate-500 font-mono">{filtered.length} lines</span>
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter logs..."
            className="w-full bg-transparent text-[10px] text-slate-200 placeholder-slate-700 focus:outline-none font-mono"
          />
        </div>
        <button
          onClick={() => setAutoScroll(v => !v)}
          className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
            autoScroll ? 'border-blue-700 text-blue-400' : 'border-slate-800 text-slate-500'
          }`}
        >
          {autoScroll ? '⬇ Auto' : 'Manual'}
        </button>
        <button onClick={copyAll} className="text-[9px] font-mono text-slate-500 hover:text-slate-300 border border-slate-800 px-2 py-0.5 rounded transition-colors">
          {copied ? '✓' : <Copy size={9} />}
        </button>
        <button onClick={downloadLogs} className="text-[9px] font-mono text-slate-500 hover:text-slate-300 border border-slate-800 px-2 py-0.5 rounded transition-colors">
          <Download size={9} />
        </button>
      </div>

      {/* Log lines */}
      <div
        ref={containerRef}
        onScroll={e => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          setAutoScroll(atBottom);
        }}
        className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed bg-slate-950 p-3 space-y-0.5"
      >
        {filtered.length === 0 ? (
          <p className="text-slate-700">No log entries{search ? ' matching filter' : ''}.</p>
        ) : (
          filtered.map((l, i) => (
            <div key={l.id ?? i} className="flex gap-2 group hover:bg-slate-900/50 rounded px-1">
              <span className="text-slate-700 shrink-0 select-none">{new Date(l.timestamp).toISOString().slice(11, 19)}</span>
              <span className={`shrink-0 w-10 ${logLevelColor(l.level)}`}>{l.level.slice(0, 4)}</span>
              <span className="text-slate-300 break-all">{l.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Run Detail Page ─────────────────────────────────────────────────────

interface RunDetailPageProps { runId: string; }

export function RunDetailPage({ runId }: RunDetailPageProps) {
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const load = useCallback(async () => {
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
    try {
      const res = await analyzeRun(runId) as { data?: { analysis?: string } };
      setAiReport(res?.data?.analysis ?? 'Analysis complete. No critical issues found.');
      toast({ kind: 'success', title: 'AI analysis complete' });
    } catch {
      toast({ kind: 'warning', title: 'AI analysis unavailable', message: 'Backend AI service may not be configured' });
      setAiReport('AI analysis requires a configured OpenAI API key in the backend environment.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-32 h-4 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="flex-1 grid grid-cols-[280px_1fr] gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          <div className="bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
        <AlertCircle size={32} className="opacity-40" />
        <p className="text-sm">Run not found: <code className="font-mono text-xs">{runId}</code></p>
        <button onClick={() => router.push('/runs')} className="text-xs text-blue-400 hover:text-blue-300">← Back to Runs</button>
      </div>
    );
  }

  const jobs = run.jobs ?? [];
  const successJobs = jobs.filter(j => j.status === 'SUCCESS').length;
  const isLive = run.status === 'RUNNING' || run.status === 'QUEUED';

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">

      {/* Header */}
      <div className="h-14 px-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push('/runs')}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ChevronLeft size={13} /> Runs
        </button>
        <div className="w-px h-4 bg-slate-800" />

        <code className="text-[11px] font-mono text-slate-400">{runId}</code>
        <StatusPill status={run.status} />

        {isLive && (
          <span className="text-[10px] font-mono text-blue-300 border border-blue-800/40 bg-blue-900/20 px-2 py-0.5 rounded-full animate-pulse">
            live
          </span>
        )}

        <div className="flex-1" />

        {run.branch && (
          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
            <GitBranch size={10} /> {run.branch}
          </span>
        )}
        {run.commitSha && (
          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
            <GitCommit size={10} /> {run.commitSha.slice(0, 7)}
          </span>
        )}
        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
          <Clock size={10} /> {formatDuration(run.durationSeconds)}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RefreshCw size={12} className={isLive ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-1.5 text-[11px] text-purple-300 hover:text-purple-200 border border-purple-800/40 bg-purple-900/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI Analyze
          </button>

          {isLive && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 text-[11px] text-rose-300 hover:text-rose-200 border border-rose-800/40 bg-rose-900/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {cancelling ? <Loader2 size={12} className="animate-spin" /> : <XSquare size={12} />}
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* AI Report (if any) */}
      {aiReport && (
        <div className="px-4 py-3 bg-purple-900/10 border border-purple-800/30 rounded-xl text-xs text-purple-200 leading-relaxed shrink-0">
          <div className="flex items-center gap-2 mb-1.5 font-semibold text-purple-300">
            <Sparkles size={12} /> AI Analysis
          </div>
          {aiReport}
        </div>
      )}

      {/* Main layout: Step Timeline + Log Viewer */}
      <div className="flex-1 min-h-0 grid grid-cols-[260px_1fr] gap-3">

        {/* Step Timeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          <div className="h-9 px-3 border-b border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Steps</span>
            <span className="text-[10px] font-mono text-slate-600">{successJobs}/{jobs.length} done</span>
          </div>

          {jobs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
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
          <div className="border-t border-slate-800 p-3 space-y-1.5 shrink-0">
            {[
              { label: 'Triggered by', value: run.triggeredBy ?? '—' },
              { label: 'Queued',       value: timeAgo(run.queuedAt) },
              { label: 'Started',      value: timeAgo(run.startedAt) },
              { label: 'Duration',     value: formatDuration(run.durationSeconds) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-[10px]">
                <span className="text-slate-600">{label}</span>
                <span className="text-slate-400 font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Log Viewer */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <LogViewer logs={logs} jobId={activeJobId} />
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
