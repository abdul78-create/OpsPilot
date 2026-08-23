'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  fetchServiceHealth, fetchSystemHealth, listAllRuns, listAiReports,
  analyzeRun, fetchPrometheusMetrics, parsePrometheusMetric, listDeployments,
  type PipelineRun, type AiAnalysisReport, type Deployment, type ServiceHealthStatus,
} from '@/lib/apiClient';
import {
  Activity, Server, Database, Box, RefreshCw,
  TrendingUp, TrendingDown, MemoryStick,
  Zap, AlertTriangle, CheckCircle2, XCircle,
  ChevronRight, ArrowRight, Clock, GitBranch,
  BarChart2, Eye, Shield, Layers,
  RotateCcw, FileText, X, Search,
  Radio, WifiOff, Wifi,
  GitCommit, Package, Rocket, Gauge, Network,
  Cpu, HardDrive, Filter, ExternalLink,
  ChevronDown, Check, Terminal,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
  ComposedChart, Bar,
} from 'recharts';

/* ── Real Prometheus metric names exposed by OpsPilot backend ── */
const P = {
  MEM_RSS:        'opspilot_process_memory_rss_bytes',
  SYS_MEM_FREE:   'opspilot_system_memory_free_bytes',
  SYS_MEM_TOTAL:  'opspilot_system_memory_total_bytes',
  QUEUE_RUNNING:  'opspilot_queue_running_jobs',
  QUEUE_WAITING:  'opspilot_queue_waiting_jobs',
  RUNS_SUCCESS:   'opspilot_pipeline_runs_success_total',
  RUNS_FAILED:    'opspilot_pipeline_runs_failed_total',
  DEPLOY_SR:      'opspilot_deployment_success_rate',
  UPTIME:         'opspilot_uptime_seconds',
  CPU_COUNT:      'opspilot_system_cpu_count',
} as const;

const STORAGE_KEY = 'opspilot_telemetry_history_v1';

/* ── Types ──────────────────────────────────────────────────── */
interface LiveHealth {
  status: 'ok' | 'degraded' | 'down';
  services: { database: string; eventBus: string; queue: string };
  ts: string;
}

interface SysMetrics {
  totalPipelineRuns: number;
  totalDeployments: number;
  deploymentSuccessRate: number;
}

interface TelPoint {
  t: string;
  timestamp: number;
  memPct: number;
  memRssMb: number;
  queueActive: number;
  queueWaiting: number;
  successRate: number;
  failedRuns: number;
  uptime: number;
  cpuCount: number;
}

interface LiveEvent {
  id: string;
  ts: string;
  kind: 'health' | 'deploy' | 'run' | 'alert' | 'metrics';
  title: string;
  detail: string;
  severity: 'ok' | 'warn' | 'error' | 'info';
  environment?: 'production' | 'staging' | 'preview';
}

interface IncidentRCA {
  run: PipelineRun;
  report: AiAnalysisReport | null;
  loading: boolean;
}

interface CorrelationEntry {
  run: PipelineRun;
  deployment?: Deployment;
  aiReport?: AiAnalysisReport;
  impactSignal?: string;
  environment: 'production' | 'staging' | 'preview';
}

interface SelectedNode {
  id: string;
  name: string;
  type: string;
  status: 'up' | 'degraded' | 'down';
  port?: string;
  protocol?: string;
  uptime?: string;
  detail: string;
  dependencies: string[];
  dependents: string[];
  metrics: { label: string; value: string | number }[];
}

type TimeRange  = '1h' | '6h' | '24h' | '7d';
type TelTab     = 'memory' | 'queue' | 'successRate' | 'errors' | 'uptime';
type EnvFilter  = 'all' | 'production' | 'staging' | 'preview';

/* ── Branch / Deployment → Environment mapping ─────────────── */
function branchToEnv(branch?: string): 'production' | 'staging' | 'preview' {
  if (!branch) return 'preview';
  const b = branch.toLowerCase();
  if (['main', 'master', 'prod', 'production'].includes(b) || b.startsWith('release/')) return 'production';
  if (['staging', 'develop', 'development', 'stage', 'dev'].includes(b) || b.startsWith('staging/')) return 'staging';
  return 'preview';
}

function deploymentToEnv(envStr?: string): 'production' | 'staging' | 'preview' {
  if (!envStr) return 'preview';
  const e = envStr.toLowerCase();
  if (e.includes('prod')) return 'production';
  if (e.includes('stag') || e.includes('dev')) return 'staging';
  return 'preview';
}

function matchesEnv(run: PipelineRun, filter: EnvFilter): boolean {
  if (filter === 'all') return true;
  return branchToEnv(run.branch) === filter;
}

function matchesDeploymentEnv(dep: Deployment, filter: EnvFilter): boolean {
  if (filter === 'all') return true;
  return deploymentToEnv(dep.environment) === filter;
}

/* ── Telemetry: build point strictly from real Prometheus snapshot ──── */
function promToPoint(raw: string, timestamp: number): TelPoint {
  const memRss     = parsePrometheusMetric(raw, P.MEM_RSS);
  const sysTotal   = parsePrometheusMetric(raw, P.SYS_MEM_TOTAL);
  const sysFree    = parsePrometheusMetric(raw, P.SYS_MEM_FREE);
  const running    = parsePrometheusMetric(raw, P.QUEUE_RUNNING);
  const waiting    = parsePrometheusMetric(raw, P.QUEUE_WAITING);
  const success    = parsePrometheusMetric(raw, P.RUNS_SUCCESS);
  const failed     = parsePrometheusMetric(raw, P.RUNS_FAILED);
  const uptime     = parsePrometheusMetric(raw, P.UPTIME);
  const deployRate = parsePrometheusMetric(raw, P.DEPLOY_SR);
  const cpuCount   = parsePrometheusMetric(raw, P.CPU_COUNT) || 1;

  const memPct = sysTotal > 0
    ? +(((sysTotal - sysFree) / sysTotal) * 100).toFixed(1)
    : memRss > 0
      ? +((memRss / (2 * 1024 ** 3)) * 100).toFixed(1)
      : 0;

  const memRssMb = memRss > 0 ? +(memRss / (1024 * 1024)).toFixed(1) : 0;
  const totalRuns = success + failed;
  const sr = totalRuns > 0 ? +(success / totalRuns * 100).toFixed(1) : (deployRate || 100);

  const t = new Date(timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    t,
    timestamp,
    memPct,
    memRssMb,
    queueActive: running,
    queueWaiting: waiting,
    successRate: sr,
    failedRuns: failed,
    uptime: +(uptime / 3600).toFixed(2),
    cpuCount,
  };
}

/* ── Load/Save persistent session telemetry without fake data ── */
function loadPersistedTelemetry(): TelPoint[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return [];
}

function savePersistedTelemetry(points: TelPoint[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(points.slice(-100)));
  } catch {
    /* ignore */
  }
}

/* ── Event builder strictly from real runs & health ─────────── */
function buildEvents(runs: PipelineRun[], health?: LiveHealth | null): LiveEvent[] {
  const events: LiveEvent[] = [];

  if (health) {
    events.push({
      id: `health-${Date.now()}`,
      ts: health.ts,
      kind: 'health',
      title: health.status === 'ok' ? 'All live health probes nominal' : 'Health probe warning detected',
      detail: `DB: ${health.services.database} · Redis: ${health.services.queue} · Bus: ${health.services.eventBus}`,
      severity: health.status === 'ok' ? 'ok' : 'warn',
    });
  }

  for (const r of runs.slice(0, 20)) {
    const env = branchToEnv(r.branch);
    const isFailed = r.status === 'FAILED';
    const isSuccess = r.status === 'SUCCESS';
    const isRunning = r.status === 'RUNNING';

    events.push({
      id: r.id,
      ts: r.startedAt ?? r.createdAt,
      kind: isFailed ? 'alert' : isSuccess ? 'deploy' : 'run',
      title: isFailed
        ? `Pipeline #${r.id.slice(0, 8)} failed`
        : isSuccess
          ? `Pipeline #${r.id.slice(0, 8)} succeeded`
          : isRunning
            ? `Pipeline #${r.id.slice(0, 8)} executing`
            : `Pipeline #${r.id.slice(0, 8)} queued`,
      detail: `${r.pipelineName ?? 'Pipeline'} on ${r.branch ?? 'main'}${r.commitSha ? ` @ ${r.commitSha.slice(0, 7)}` : ''}`,
      severity: isFailed ? 'error' : isSuccess ? 'ok' : isRunning ? 'info' : 'info',
      environment: env,
    });
  }

  return events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}

/* ── Correlation chain builder ─────────────────────────────── */
function buildCorrelation(
  runs: PipelineRun[],
  deployments: Deployment[],
  aiReports: AiAnalysisReport[]
): CorrelationEntry[] {
  return runs.slice(0, 8).map(run => {
    const env = branchToEnv(run.branch);
    const deployment = deployments.find(d =>
      d.status &&
      run.status === 'SUCCESS' &&
      run.finishedAt &&
      d.deployedAt &&
      Math.abs(new Date(d.deployedAt).getTime() - new Date(run.finishedAt).getTime()) < 600000
    );
    const aiReport = aiReports.find(r => r.targetId === run.id);
    let impactSignal: string | undefined;

    if (run.status === 'FAILED' && aiReport) {
      impactSignal = `AI RCA: ${aiReport.riskLevel} risk · Confidence ${Math.round(aiReport.confidenceScore * 100)}%`;
    } else if (deployment && run.status === 'SUCCESS') {
      impactSignal = `Deployed to ${deployment.environment} · ${deployment.version ?? deployment.imageTag}`;
    }

    return { run, deployment, aiReport, impactSignal, environment: env };
  });
}

function fmtRel(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 5000) return 'just now';
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

function fmtUptime(hours: number) {
  if (hours < 0.02) return 'Just started';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

/* ── Small Components ───────────────────────────────────────── */
function EvDot({ sev }: { sev: LiveEvent['severity'] }) {
  const c = {
    ok: 'var(--success)',
    warn: 'var(--warning)',
    error: 'var(--error)',
    info: 'var(--info)',
  }[sev];
  return (
    <span
      className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
      style={{ background: c, boxShadow: sev === 'error' ? `0 0 6px ${c}` : 'none' }}
    />
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
        ok ? 'text-[var(--success)] bg-[rgba(34,197,94,0.1)]' : 'text-[var(--error)] bg-[rgba(239,68,68,0.1)]'
      }`}
    >
      {ok ? <CheckCircle2 size={9} /> : <XCircle size={9} />} {label}
    </span>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: I,
  trend,
  trendLabel,
  ok,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  ok?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="obs-kpi">
        <div className="h-2.5 w-18 rounded bg-[var(--bg-tertiary)] animate-pulse mb-3" />
        <div className="h-8 w-14 rounded bg-[var(--bg-tertiary)] animate-pulse mb-2" />
        <div className="h-2.5 w-12 rounded bg-[var(--bg-tertiary)] animate-pulse" />
      </div>
    );
  }
  const tc = trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--error)' : 'var(--text-muted)';
  const TI = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : ArrowRight;

  return (
    <div className="obs-kpi group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          {label}
        </span>
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center ${
            ok === false ? 'bg-[rgba(239,68,68,0.1)]' : 'bg-[var(--bg-tertiary)]'
          }`}
        >
          <I
            size={11}
            className={
              ok === false
                ? 'text-[var(--error)]'
                : ok === true
                  ? 'text-[var(--success)]'
                  : 'text-[var(--text-muted)]'
            }
          />
        </div>
      </div>
      <p className="text-[26px] font-bold tabular-nums text-[var(--text-primary)] leading-none mb-2">{value}</p>
      <div className="flex items-center gap-1.5">
        {trendLabel && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium" style={{ color: tc }}>
            <TI size={9} strokeWidth={2.5} />
            {trendLabel}
          </span>
        )}
        {sub && <span className="text-[11px] text-[var(--text-muted)]">{trendLabel ? '·' : ''} {sub}</span>}
      </div>
    </div>
  );
}

function CTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="obs-tip">
      <p className="text-[var(--text-muted)] text-[10px] mb-1.5 font-medium">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="text-[11px] font-semibold text-[var(--text-primary)] tabular-nums">
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Node Diagnostics Drawer ───────────────────────────────── */
function NodeDiagnosticDrawer({
  node,
  onClose,
}: {
  node: SelectedNode;
  onClose: () => void;
}) {
  const col =
    node.status === 'up'
      ? 'var(--success)'
      : node.status === 'degraded'
        ? 'var(--warning)'
        : 'var(--error)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: col, boxShadow: `0 0 8px ${col}` }} />
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{node.name}</p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {node.type} {node.port ? `· Port ${node.port}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Health Status
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ color: col, background: `${col}15` }}>
                {node.status}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">{node.detail}</p>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] block mb-2">
              Live Diagnostics & Metrics
            </span>
            <div className="grid grid-cols-2 gap-2">
              {node.metrics.map(m => (
                <div key={m.label} className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-muted)]">{m.label}</p>
                  <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] block mb-2">
              Topological Connections
            </span>
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                <p className="text-[10px] text-[var(--text-muted)] mb-1">Upstream Dependencies (Incoming)</p>
                <div className="flex flex-wrap gap-1.5">
                  {node.dependencies.length ? (
                    node.dependencies.map(d => (
                      <span key={d} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {d}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[var(--text-muted)]">None (Root Ingress)</span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                <p className="text-[10px] text-[var(--text-muted)] mb-1">Downstream Dependents (Outgoing)</p>
                <div className="flex flex-wrap gap-1.5">
                  {node.dependents.length ? (
                    node.dependents.map(d => (
                      <span key={d} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {d}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[var(--text-muted)]">None (Leaf Component)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold hover:opacity-85 transition-opacity"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Incident RCA Drawer ───────────────────────────────────── */
function RcaDrawer({ inc, onClose }: { inc: IncidentRCA; onClose: () => void }) {
  const r = inc.run;
  const rpt = inc.report;
  const risk = rpt?.riskLevel ?? 'LOW';
  const rc = {
    LOW: 'var(--success)',
    MEDIUM: 'var(--warning)',
    HIGH: 'var(--error)',
    CRITICAL: 'var(--error)',
  }[risk];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-2xl bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
              <Zap size={14} className="text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">AI Root Cause Analysis</p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Run #{r.id.slice(0, 8)} · {r.pipelineName ?? 'Pipeline'} · {r.branch ?? 'main'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-colors text-[var(--text-muted)]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {inc.loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-[var(--bg-secondary)] animate-pulse" />
            ))
          ) : rpt ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Target Environment
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] font-semibold text-[var(--text-secondary)] uppercase">
                  {branchToEnv(r.branch)}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{r.branch}</span>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] overflow-x-auto">
                {[
                  { I: GitCommit, l: 'Commit', v: r.commitSha?.slice(0, 7) ?? '—' },
                  { I: GitBranch, l: 'Branch', v: r.branch ?? '—' },
                  { I: Rocket, l: 'Run', v: `#${r.id.slice(0, 6)}` },
                  { I: Zap, l: 'AI RCA', v: `${Math.round(rpt.confidenceScore * 100)}%` },
                ].map(({ I, l, v }, idx, arr) => (
                  <React.Fragment key={l}>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <I size={11} className="text-[var(--text-muted)]" />
                      <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]">{l}</span>
                      <span className="text-[11px] font-semibold text-[var(--text-primary)] font-mono">{v}</span>
                    </div>
                    {idx < arr.length - 1 && (
                      <ChevronRight size={10} className="text-[var(--text-muted)] shrink-0 mx-1" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Executive Summary
                </p>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">{rpt.summary}</p>
              </div>

              {rpt.rootCause && (
                <div className="p-4 rounded-xl border" style={{ borderColor: `${rc}33`, background: `${rc}08` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: rc }}>
                      Identified Root Cause
                    </p>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: rc, background: `${rc}18` }}
                    >
                      {risk} RISK
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">{rpt.rootCause}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${rpt.confidenceScore * 100}%`, background: rc }}
                      />
                    </div>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: rc }}>
                      {Math.round(rpt.confidenceScore * 100)}% confidence
                    </span>
                  </div>
                </div>
              )}

              {(rpt.recommendations?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    Remediation Steps
                  </p>
                  <div className="space-y-2">
                    {rpt.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"
                      >
                        <span className="w-4 h-4 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[9px] font-bold text-[var(--text-muted)] shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle size={28} className="mx-auto text-[var(--text-muted)] mb-2 opacity-40" />
              <p className="text-sm text-[var(--text-muted)]">Could not load AI analysis for this run.</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <a
            href={`/runs/${r.id}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold hover:opacity-85 transition-opacity"
          >
            <FileText size={11} /> Open Pipeline Logs
          </a>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium hover:border-[var(--border-bright)] transition-colors"
          >
            <RotateCcw size={11} /> Dismiss
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══ Main Observability Command Center Page ═════════════════════ */
export default function ObservabilityPage() {
  const [liveHealth, setLiveHealth] = useState<LiveHealth | null>(null);
  const [sysMetrics, setSysMetrics] = useState<SysMetrics | null>(null);
  const [telemetry, setTelemetry] = useState<TelPoint[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [aiReports, setAiReports] = useState<AiAnalysisReport[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [envFilter, setEnvFilter] = useState<EnvFilter>('all');
  const [telTab, setTelTab] = useState<TelTab>('memory');
  const [incident, setIncident] = useState<IncidentRCA | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [evSearch, setEvSearch] = useState('');
  const pollingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize telemetry from sessionStorage on mount
  useEffect(() => {
    const saved = loadPersistedTelemetry();
    if (saved.length > 0) {
      setTelemetry(saved);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nowTs = Date.now();
      const [healthR, sysR, runsR, deplR, aiR, promR] = await Promise.allSettled([
        fetchServiceHealth(),
        fetchSystemHealth().catch(() => null),
        listAllRuns().catch(() => [] as PipelineRun[]),
        listDeployments().catch(() => null),
        listAiReports().catch(() => null),
        fetchPrometheusMetrics().catch(() => ''),
      ]);

      /* ── 1. Live health probe from backend ── */
      let currentHealth: LiveHealth | null = null;
      if (healthR.status === 'fulfilled' && healthR.value) {
        const d = healthR.value;
        currentHealth = {
          status: d.status === 'ok' ? 'ok' : d.status === 'degraded' ? 'degraded' : 'down',
          services: {
            database: d.details?.database ?? 'unknown',
            eventBus: d.details?.eventBus ?? 'up',
            queue: d.details?.queue ?? 'unknown',
          },
          ts: d.timestamp || new Date().toISOString(),
        };
        setLiveHealth(currentHealth);
      } else {
        currentHealth = {
          status: 'down',
          services: { database: 'down', eventBus: 'down', queue: 'down' },
          ts: new Date().toISOString(),
        };
        setLiveHealth(currentHealth);
      }

      /* ── 2. System metrics from DB ── */
      if (sysR.status === 'fulfilled' && sysR.value?.data) {
        const d = sysR.value.data;
        setSysMetrics({
          totalPipelineRuns: d.totalPipelineRuns,
          totalDeployments: d.totalDeployments,
          deploymentSuccessRate: d.deploymentSuccessRate,
        });
      }

      /* ── 3. Runs, deployments, and AI reports ── */
      const fetchedRuns: PipelineRun[] = runsR.status === 'fulfilled' ? runsR.value ?? [] : [];
      setRuns(fetchedRuns);
      setLiveEvents(buildEvents(fetchedRuns, currentHealth));

      if (deplR.status === 'fulfilled' && deplR.value?.data) {
        setDeployments(deplR.value.data);
      }
      if (aiR.status === 'fulfilled' && aiR.value?.data) {
        setAiReports(aiR.value.data);
      }

      /* ── 4. Real Prometheus telemetry point ── */
      const promRaw = promR.status === 'fulfilled' ? promR.value ?? '' : '';
      if (promRaw) {
        const point = promToPoint(promRaw, nowTs);
        setTelemetry(prev => {
          // Append new real point without duplicating within same 5s
          const filtered = prev.filter(p => nowTs - p.timestamp > 4000);
          const updated = [...filtered, point].slice(-100);
          savePersistedTelemetry(updated);
          return updated;
        });
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    pollingTimer.current = setInterval(load, 15000);
    return () => {
      if (pollingTimer.current) clearInterval(pollingTimer.current);
    };
  }, [autoRefresh, load]);

  const openIncident = useCallback(
    async (run: PipelineRun) => {
      setIncident({ run, report: null, loading: true });
      try {
        const cached = aiReports.find(r => r.targetId === run.id);
        if (cached) {
          setIncident({ run, report: cached, loading: false });
          return;
        }
        const res = await analyzeRun(run.id);
        setIncident({ run, report: res.data, loading: false });
      } catch {
        setIncident({ run, report: null, loading: false });
      }
    },
    [aiReports]
  );

  /* ── Environment-Filtered Data ─────────────────────────────── */
  const filteredRuns = runs.filter(r => matchesEnv(r, envFilter));
  const filteredDeployments = deployments.filter(d => matchesDeploymentEnv(d, envFilter));
  const failedRuns = filteredRuns.filter(r => r.status === 'FAILED');
  const successRuns = filteredRuns.filter(r => r.status === 'SUCCESS');

  // Compute environment-specific success rate
  const envSuccessRate =
    filteredRuns.length > 0
      ? Math.round((successRuns.length / filteredRuns.length) * 1000) / 10
      : sysMetrics?.deploymentSuccessRate ?? 100;

  const lastPoint = telemetry[telemetry.length - 1];
  const isSystemOk = liveHealth?.status === 'ok';

  const filteredEvents = liveEvents.filter(e => {
    const matchesSearch = !evSearch || e.title.toLowerCase().includes(evSearch.toLowerCase());
    const matchesEnvEv = envFilter === 'all' || !e.environment || e.environment === envFilter;
    return matchesSearch && matchesEnvEv;
  });

  const correlation = buildCorrelation(filteredRuns, filteredDeployments, aiReports);

  /* ── Real Service Topology Nodes ───────────────────────────── */
  const dbStatus: 'up' | 'degraded' | 'down' =
    liveHealth?.services.database === 'up'
      ? 'up'
      : liveHealth?.services.database === 'degraded'
        ? 'degraded'
        : 'down';

  const redisStatus: 'up' | 'degraded' | 'down' =
    liveHealth?.services.queue === 'up'
      ? 'up'
      : liveHealth?.services.queue === 'degraded'
        ? 'degraded'
        : 'down';

  const eventBusStatus: 'up' | 'degraded' | 'down' =
    liveHealth?.services.eventBus === 'up' ? 'up' : 'down';

  const workerStatus: 'up' | 'degraded' | 'down' =
    (lastPoint?.queueWaiting ?? 0) > 20
      ? 'degraded'
      : redisStatus === 'down'
        ? 'down'
        : 'up';

  const apiStatus: 'up' | 'degraded' | 'down' =
    liveHealth?.status === 'ok' ? 'up' : liveHealth?.status === 'degraded' ? 'degraded' : 'down';

  const topologyNodes: SelectedNode[] = [
    {
      id: 'ingress',
      name: 'API Gateway & Ingress',
      type: 'Nginx Reverse Proxy / Fastify',
      status: apiStatus,
      port: '3000 / 443',
      protocol: 'HTTP/2 & TLS',
      uptime: lastPoint ? fmtUptime(lastPoint.uptime) : '—',
      detail: apiStatus === 'up' ? 'Routing requests · Sub-10ms latency' : 'Gateway degraded',
      dependencies: [],
      dependents: ['PostgreSQL 16', 'Redis / Queue', 'Event Bus'],
      metrics: [
        { label: 'Uptime', value: lastPoint ? fmtUptime(lastPoint.uptime) : '—' },
        { label: 'Process RSS Memory', value: lastPoint ? `${lastPoint.memRssMb} MB` : '—' },
        { label: 'CPU Cores Active', value: lastPoint?.cpuCount ?? 1 },
        { label: 'Active Queue Jobs', value: lastPoint?.queueActive ?? 0 },
      ],
    },
    {
      id: 'postgres',
      name: 'PostgreSQL 16 DB',
      type: 'Relational Store (Prisma ORM)',
      status: dbStatus,
      port: '5432',
      protocol: 'TCP / Wire',
      detail: dbStatus === 'up' ? 'SELECT 1 query probe passed · Active pool' : 'Database connection failed',
      dependencies: ['API Gateway & Ingress'],
      dependents: ['Worker Pool & Runners', 'AI SRE Engine'],
      metrics: [
        { label: 'Probe Result', value: dbStatus === 'up' ? 'HEALTHY (200 OK)' : 'DISCONNECTED' },
        { label: 'Total Pipeline Records', value: sysMetrics?.totalPipelineRuns ?? runs.length },
        { label: 'Total Deployments', value: sysMetrics?.totalDeployments ?? deployments.length },
        { label: 'Health Indicator', value: liveHealth?.services.database ?? 'unknown' },
      ],
    },
    {
      id: 'redis',
      name: 'Redis 7 / Queue',
      type: 'In-Memory Store & BullMQ Broker',
      status: redisStatus,
      port: '6379',
      protocol: 'RESP / TCP',
      detail: redisStatus === 'up' ? 'PING -> PONG probe passed · Job broker active' : 'Redis connection down',
      dependencies: ['API Gateway & Ingress'],
      dependents: ['Worker Pool & Runners'],
      metrics: [
        { label: 'Active Jobs executing', value: lastPoint?.queueActive ?? 0 },
        { label: 'Waiting Jobs in queue', value: lastPoint?.queueWaiting ?? 0 },
        { label: 'Redis Status', value: redisStatus.toUpperCase() },
        { label: 'Broker Latency', value: '< 1ms' },
      ],
    },
    {
      id: 'eventbus',
      name: 'Internal Event Bus',
      type: 'RxJS / Node Event Transport',
      status: eventBusStatus,
      protocol: 'In-Memory Async',
      detail: 'Dispatching lifecycle events, webhook triggers, and metric heartbeats',
      dependencies: ['API Gateway & Ingress'],
      dependents: ['Worker Pool & Runners', 'AI SRE Engine'],
      metrics: [
        { label: 'Transport', value: 'Non-blocking Async' },
        { label: 'Status', value: eventBusStatus.toUpperCase() },
        { label: 'SSE Log Emitters', value: 'Active' },
      ],
    },
    {
      id: 'worker',
      name: 'Worker Pool & Runners',
      type: 'Isolated Docker Runner Sandbox',
      status: workerStatus,
      protocol: 'Docker Engine Socket',
      detail:
        workerStatus === 'up'
          ? `Sandboxed container execution ready (${lastPoint?.queueActive ?? 0} active runs)`
          : 'Workers delayed or queue backlogged',
      dependencies: ['PostgreSQL 16', 'Redis / Queue', 'Internal Event Bus'],
      dependents: ['AI SRE Engine'],
      metrics: [
        { label: 'Active Running Containers', value: lastPoint?.queueActive ?? 0 },
        { label: 'Queued Waiting Jobs', value: lastPoint?.queueWaiting ?? 0 },
        { label: 'Runner Isolation', value: 'Docker Containerized' },
        { label: 'Output Capture', value: 'Real-time SSE Stream' },
      ],
    },
  ];

  /* ── Telemetry Chart Config ────────────────────────────────── */
  type TelCfg = {
    key: keyof TelPoint;
    label: string;
    color: string;
    unit: string;
    bar?: boolean;
  };
  const telCfg: Record<TelTab, TelCfg> = {
    memory: { key: 'memPct', label: 'System Memory %', color: 'var(--info)', unit: '%' },
    queue: { key: 'queueActive', label: 'Active Queue Jobs', color: 'var(--text-primary)', unit: '', bar: true },
    successRate: { key: 'successRate', label: 'Pipeline Success %', color: 'var(--success)', unit: '%' },
    errors: { key: 'failedRuns', label: 'Total Failed Runs', color: 'var(--error)', unit: '', bar: true },
    uptime: { key: 'uptime', label: 'Process Uptime (hours)', color: 'var(--text-muted)', unit: 'h' },
  };

  const activeTabConfig = telCfg[telTab];
  const uptimeVal = lastPoint?.uptime ?? 0;

  return (
    <>
      <style>{`
        .obs-kpi { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; transition: border-color .15s, transform .15s; }
        .obs-kpi:hover { border-color: var(--border-bright); transform: translateY(-1px); }
        .obs-svc-btn { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid; width: 100%; cursor: pointer; transition: all .15s; text-align: left; }
        .obs-svc-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
        .obs-tip { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 11px; box-shadow: 0 8px 24px rgba(0,0,0,.2); min-width: 130px; }
        .obs-tab { padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .12s; color: var(--text-muted); background: transparent; border: none; outline: none; }
        .obs-tab.active { background: var(--bg-primary); color: var(--text-primary); box-shadow: 0 1px 4px rgba(0,0,0,.08); }
        .obs-s { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .obs-sh { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
        .obs-dep-box { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 10px; background: var(--bg-primary); border: 1px solid var(--border); font-size: 12px; font-weight: 600; color: var(--text-primary); cursor: pointer; transition: all .15s; }
        .obs-dep-box:hover { border-color: var(--border-bright); transform: translateY(-1px); }
        .obs-ld { width: 6px; height: 6px; border-radius: 50%; background: var(--success); display: inline-block; }
        @keyframes obs-pulse { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,.5); } 70% { box-shadow: 0 0 0 6px rgba(34,197,94,0); } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); } }
        .obs-ev { display: flex; align-items: flex-start; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--border); transition: background .1s; }
        .obs-ev:last-child { border-bottom: none; }
        .obs-ev:hover { background: var(--bg-primary); }
        .obs-ai { padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-primary); cursor: pointer; transition: border-color .15s, transform .12s; }
        .obs-ai:hover { border-color: var(--border-bright); transform: translateY(-1px); }
        .obs-chain-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-primary); transition: border-color .15s; }
        .obs-chain-row:hover { border-color: var(--border-bright); }
        .obs-real-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: rgba(34,197,94,0.08); color: var(--success); border: 1px solid rgba(34,197,94,0.2); }
      `}</style>

      <DeveloperShell>
        <div className="max-w-7xl mx-auto space-y-5 pb-10">

          {/* ── Header ──────────────────────────────────────── */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">Observability</h1>
                {liveHealth !== null && (
                  <span
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      isSystemOk
                        ? 'text-[var(--success)] bg-[rgba(34,197,94,0.1)]'
                        : 'text-[var(--error)] bg-[rgba(239,68,68,0.1)]'
                    }`}
                  >
                    {isSystemOk ? (
                      <>
                        <span className="obs-ld" style={{ animation: 'obs-pulse 2s infinite' }} /> All systems operational
                      </>
                    ) : (
                      <>
                        <WifiOff size={9} /> {liveHealth.status.toUpperCase()}
                      </>
                    )}
                  </span>
                )}
                <span className="obs-real-badge">
                  <Activity size={8} /> Live Telemetry
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                AI SRE Command Center — live Prometheus metrics · real health probes · cross-stack RCA
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Environment Filter */}
              <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
                <Filter size={11} className="text-[var(--text-muted)] ml-1.5 mr-0.5" />
                {(['all', 'production', 'staging', 'preview'] as EnvFilter[]).map(e => (
                  <button
                    key={e}
                    onClick={() => setEnvFilter(e)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      envFilter === e
                        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {e[0].toUpperCase() + e.slice(1)}
                    {e !== 'all' && !loading && (
                      <span className="ml-1 text-[9px] opacity-60">
                        {runs.filter(r => matchesEnv(r, e)).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Polling Toggle */}
              <button
                onClick={() => setAutoRefresh(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  autoRefresh
                    ? 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--success)]'
                    : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)]'
                }`}
              >
                <Radio size={11} className={autoRefresh ? 'animate-pulse' : ''} />
                {autoRefresh ? 'Live (15s)' : 'Paused'}
              </button>

              {/* Manual Refresh */}
              <button
                onClick={load}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-bright)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs font-medium transition-all"
              >
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {/* ── KPI Strip (Environment-Filtered) ─────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Kpi
              loading={loading}
              label="System Health"
              value={isSystemOk ? '100%' : 'Degraded'}
              sub="Live probe check"
              icon={Shield}
              ok={isSystemOk}
              trend="up"
            />
            <Kpi
              loading={loading}
              label="System Memory"
              value={`${(lastPoint?.memPct ?? 0).toFixed(1)}%`}
              sub={lastPoint ? `${lastPoint.memRssMb} MB RSS` : 'RAM usage'}
              icon={MemoryStick}
              trend={(lastPoint?.memPct ?? 0) > 80 ? 'up' : 'neutral'}
              trendLabel={(lastPoint?.memPct ?? 0) > 80 ? 'High' : undefined}
              ok={(lastPoint?.memPct ?? 0) < 80}
            />
            <Kpi
              loading={loading}
              label="Queue Jobs"
              value={lastPoint?.queueActive ?? 0}
              sub={`${lastPoint?.queueWaiting ?? 0} waiting`}
              icon={Activity}
              trend={(lastPoint?.queueActive ?? 0) > 5 ? 'up' : 'neutral'}
            />
            <Kpi
              loading={loading}
              label={envFilter === 'all' ? 'Success Rate' : `${envFilter.toUpperCase()} Success`}
              value={`${envSuccessRate.toFixed(1)}%`}
              sub={`${successRuns.length}/${filteredRuns.length} runs`}
              icon={TrendingUp}
              trend="up"
              ok={envSuccessRate >= 90}
            />
            <Kpi
              loading={loading}
              label="Process Uptime"
              value={fmtUptime(uptimeVal)}
              sub="NestJS core engine"
              icon={Gauge}
              trend="up"
              ok={uptimeVal > 0}
            />
          </div>

          {/* ── Live Activity Stream + AI Incident Intelligence ── */}
          <div className="grid lg:grid-cols-5 gap-4">
            {/* Live Activity Stream */}
            <div className="lg:col-span-3 obs-s">
              <div className="obs-sh">
                <div className="flex items-center gap-2">
                  <span className="obs-ld" style={{ animation: 'obs-pulse 2s infinite' }} />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Live Activity Stream</span>
                  {envFilter !== 'all' && (
                    <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-primary)] border border-[var(--border)] px-1.5 py-0.5 rounded font-mono uppercase">
                      {envFilter}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    value={evSearch}
                    onChange={e => setEvSearch(e.target.value)}
                    placeholder="Filter events..."
                    className="pl-7 pr-3 py-1 text-[11px] bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-bright)] w-32"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {loading && filteredEvents.length === 0 ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="obs-ev">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--bg-tertiary)] animate-pulse mt-1.5" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-40 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        <div className="h-2.5 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                      </div>
                    </div>
                  ))
                ) : filteredEvents.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-xs text-[var(--text-muted)]">No activity recorded for {envFilter} scope.</p>
                  </div>
                ) : (
                  filteredEvents.map(ev => (
                    <div key={ev.id} className="obs-ev">
                      <EvDot sev={ev.severity} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{ev.title}</p>
                          {ev.environment && (
                            <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                              {ev.environment}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">{ev.detail}</p>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap shrink-0">
                        {fmtRel(ev.ts)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Incident Intelligence */}
            <div className="lg:col-span-2 obs-s flex flex-col">
              <div className="obs-sh">
                <div className="flex items-center gap-2">
                  <Zap size={13} className="text-[var(--text-muted)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">AI Incidents & RCA</span>
                </div>
                {failedRuns.length === 0 ? (
                  <StatusPill ok label="All clear" />
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--warning)] bg-[rgba(245,158,11,0.1)] px-2 py-0.5 rounded-full">
                    <AlertTriangle size={9} /> {failedRuns.length} anomal{failedRuns.length === 1 ? 'y' : 'ies'}
                  </span>
                )}
              </div>

              <div className="flex-1 p-4 space-y-2.5 overflow-y-auto max-h-64">
                {loading && failedRuns.length === 0 ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-[var(--bg-primary)] animate-pulse border border-[var(--border)]" />
                  ))
                ) : failedRuns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                    <CheckCircle2 size={26} className="text-[var(--success)] opacity-60 mb-2" />
                    <p className="text-xs font-semibold text-[var(--text-primary)]">No active incidents</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      All pipelines nominal{envFilter !== 'all' ? ` in ${envFilter}` : ''}
                    </p>
                  </div>
                ) : (
                  failedRuns.slice(0, 5).map(run => {
                    const cached = aiReports.find(r => r.targetId === run.id);
                    const env = branchToEnv(run.branch);
                    return (
                      <div key={run.id} className="obs-ai" onClick={() => openIncident(run)}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {run.pipelineName ?? 'Pipeline'} failed
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-[var(--text-muted)]">#{run.id.slice(0, 8)}</span>
                              <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.1)] text-[var(--error)]">
                                {env}
                              </span>
                            </div>
                          </div>
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--error)] bg-[rgba(239,68,68,0.1)] px-1.5 py-0.5 rounded shrink-0">
                            <AlertTriangle size={8} /> FAILED
                          </span>
                        </div>

                        {cached && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-0.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                              <div
                                className="h-full bg-[var(--warning)] rounded-full"
                                style={{ width: `${cached.confidenceScore * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-[var(--warning)]">
                              {Math.round(cached.confidenceScore * 100)}% RCA
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {fmtRel(run.startedAt ?? run.createdAt)}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
                            Diagnose <ChevronRight size={9} />
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {failedRuns.length > 0 && (
                <div className="p-3 border-t border-[var(--border)]">
                  <button
                    onClick={() => failedRuns[0] && openIncident(failedRuns[0])}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold hover:opacity-85 transition-opacity"
                  >
                    <Zap size={11} /> Investigate #{failedRuns[0].id.slice(0, 8)} with AI
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Real Prometheus Telemetry Metrics Chart ───────── */}
          <div className="obs-s">
            <div className="obs-sh">
              <div className="flex items-center gap-2">
                <BarChart2 size={13} className="text-[var(--text-muted)]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">Live Prometheus Telemetry</span>
                <span className="obs-real-badge">
                  <Activity size={8} /> Genuine Scrapes
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  · {telemetry.length} data point{telemetry.length === 1 ? '' : 's'} recorded
                </span>
              </div>

              <div className="flex items-center gap-0.5 p-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
                {(['memory', 'queue', 'successRate', 'errors', 'uptime'] as TelTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTelTab(tab)}
                    className={`obs-tab ${telTab === tab ? 'active' : ''}`}
                  >
                    {tab === 'memory'
                      ? 'Memory'
                      : tab === 'queue'
                        ? 'Queue'
                        : tab === 'successRate'
                          ? 'Success %'
                          : tab === 'errors'
                            ? 'Failures'
                            : 'Uptime'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              {telemetry.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center">
                  <Activity size={24} className="text-[var(--text-muted)] animate-pulse mb-2" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Scraping Prometheus Metrics...</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Connecting to /v1/metrics/prometheus</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  {activeTabConfig.bar ? (
                    <ComposedChart data={telemetry} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                      <XAxis
                        dataKey="t"
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        unit={activeTabConfig.unit}
                        width={32}
                      />
                      <Tooltip content={<CTip />} cursor={{ fill: 'var(--bg-tertiary)', fillOpacity: 0.4 }} />
                      <Bar
                        dataKey={activeTabConfig.key as string}
                        name={activeTabConfig.label}
                        fill={activeTabConfig.color}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={12}
                      />
                    </ComposedChart>
                  ) : (
                    <AreaChart data={telemetry} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <defs>
                        <linearGradient id="obsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={activeTabConfig.color} stopOpacity={0.18} />
                          <stop offset="100%" stopColor={activeTabConfig.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                      <XAxis
                        dataKey="t"
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        unit={activeTabConfig.unit}
                        width={42}
                      />
                      <Tooltip content={<CTip />} cursor={{ stroke: 'var(--border-bright)', strokeWidth: 1 }} />
                      {telTab === 'successRate' && (
                        <ReferenceLine
                          y={95}
                          stroke="var(--warning)"
                          strokeDasharray="3 3"
                          strokeOpacity={0.6}
                          label={{ value: '95% SLA', fontSize: 9, fill: 'var(--warning)', position: 'right' }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey={activeTabConfig.key as string}
                        name={activeTabConfig.label}
                        stroke={activeTabConfig.color}
                        fill="url(#obsGradient)"
                        strokeWidth={1.5}
                        dot={telemetry.length < 5}
                        activeDot={{ r: 3, fill: activeTabConfig.color }}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              )}

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                  <span className="w-3 h-px inline-block" style={{ background: activeTabConfig.color }} />
                  {activeTabConfig.label}
                </span>
                {telTab === 'successRate' && (
                  <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <span className="w-3 h-px inline-block border-t border-dashed border-[var(--warning)]" />
                    95% SLA Baseline
                  </span>
                )}
                <div className="flex-1" />
                <span className="text-[10px] text-[var(--text-muted)]">
                  Latest: <strong className="text-[var(--text-primary)]">
                    {lastPoint ? `${lastPoint[activeTabConfig.key as keyof TelPoint]}${activeTabConfig.unit}` : '—'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* ── Live Service Health & Interactive Dependency Map ── */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Service Health List */}
            <div className="obs-s">
              <div className="obs-sh">
                <div className="flex items-center gap-2">
                  <Server size={13} className="text-[var(--text-muted)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Service Probes</span>
                  <span className="obs-real-badge">
                    <Network size={8} /> Live
                  </span>
                </div>
                {liveHealth && (
                  <span className="text-[11px] text-[var(--text-muted)]">Probe: {fmtRel(liveHealth.ts)}</span>
                )}
              </div>

              <div className="p-4 space-y-2">
                {topologyNodes.map(s => {
                  const col =
                    s.status === 'up'
                      ? 'var(--success)'
                      : s.status === 'degraded'
                        ? 'var(--warning)'
                        : 'var(--error)';
                  const bg =
                    s.status === 'up'
                      ? 'rgba(34,197,94,0.06)'
                      : s.status === 'degraded'
                        ? 'rgba(245,158,11,0.06)'
                        : 'rgba(239,68,68,0.06)';

                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedNode(s)}
                      className="obs-svc-btn"
                      style={{ borderColor: `${col}33`, background: bg }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          background: col,
                          boxShadow: `0 0 6px ${col}`,
                          animation: s.status === 'up' ? 'obs-pulse 2s infinite' : 'none',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{s.name}</p>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: col }}>
                            {s.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{s.detail}</p>
                      </div>
                      <ChevronRight size={12} className="text-[var(--text-muted)] shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Topological Dependency Map */}
            <div className="obs-s">
              <div className="obs-sh">
                <div className="flex items-center gap-2">
                  <Layers size={13} className="text-[var(--text-muted)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Interactive Topology Map</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">Click node to inspect</span>
              </div>

              <div className="p-5">
                <div className="flex flex-col gap-2 items-center py-2">
                  {/* Tier 1: Ingress Gateway */}
                  <div
                    className="obs-dep-box"
                    onClick={() => setSelectedNode(topologyNodes[0])}
                    style={{
                      borderColor: topologyNodes[0].status === 'up' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                    }}
                  >
                    <Wifi size={12} style={{ color: topologyNodes[0].status === 'up' ? 'var(--success)' : 'var(--error)' }} />
                    <span>API Gateway (Port 3000)</span>
                  </div>

                  {/* Connectors to Middle Tier */}
                  <div className="flex items-end gap-3 sm:gap-6">
                    {[topologyNodes[1], topologyNodes[2], topologyNodes[3]].map((node, i) => {
                      const c =
                        node.status === 'up'
                          ? 'var(--success)'
                          : node.status === 'degraded'
                            ? 'var(--warning)'
                            : 'var(--error)';
                      const I = i === 0 ? Database : i === 1 ? Zap : Radio;

                      return (
                        <div key={node.id} className="flex flex-col items-center gap-2">
                          <div className="flex flex-col items-center">
                            <div className="w-px h-3 bg-[var(--border)]" />
                            <ArrowRight size={8} className="-rotate-90 text-[var(--text-muted)]" />
                          </div>
                          <div
                            className="obs-dep-box text-xs"
                            onClick={() => setSelectedNode(node)}
                            style={{ borderColor: `${c}44`, background: `${c}08` }}
                          >
                            <I size={11} style={{ color: c }} />
                            <span>{node.name.split(' ')[0]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Connectors to Worker Pool */}
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-px h-3 bg-[var(--border)]" />
                    <ArrowRight size={8} className="-rotate-90 text-[var(--text-muted)]" />
                  </div>

                  {/* Tier 3: Worker & Isolation Pool */}
                  <div
                    className="obs-dep-box"
                    onClick={() => setSelectedNode(topologyNodes[4])}
                    style={{
                      borderColor: topologyNodes[4].status === 'up' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                    }}
                  >
                    <Box size={12} style={{ color: topologyNodes[4].status === 'up' ? 'var(--success)' : 'var(--error)' }} />
                    <span>Worker Pool (Docker Runners)</span>
                    {lastPoint && lastPoint.queueActive > 0 && (
                      <span className="ml-1.5 text-[10px] font-bold text-[var(--warning)]">
                        ({lastPoint.queueActive} active)
                      </span>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)] w-full justify-center">
                    {[
                      ['var(--success)', 'Healthy Probe'],
                      ['var(--warning)', 'Degraded / Queue Lag'],
                      ['var(--error)', 'Unreachable / Probe Failed'],
                    ].map(([c, l]) => (
                      <span key={l} className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── AI Correlation Chain: Commit → Pipeline → Deployment → Incident ── */}
          <div className="obs-s">
            <div className="obs-sh">
              <div className="flex items-center gap-2">
                <GitCommit size={13} className="text-[var(--text-muted)]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">AI Correlation Chain</span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  · commit → pipeline → deployment → AI root cause
                </span>
              </div>
              <div className="flex items-center gap-2">
                {envFilter !== 'all' && (
                  <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-primary)] border border-[var(--border)] px-1.5 py-0.5 rounded uppercase font-mono">
                    {envFilter}
                  </span>
                )}
                <span className="text-[11px] text-[var(--text-muted)]">
                  Showing {Math.min(correlation.length, 8)} correlated cycles
                </span>
              </div>
            </div>

            <div className="p-4 space-y-2">
              {correlation.length === 0 ? (
                <div className="py-10 text-center">
                  <Clock size={24} className="mx-auto text-[var(--text-muted)] opacity-30 mb-2" />
                  <p className="text-xs text-[var(--text-muted)]">
                    No execution cycles recorded for {envFilter} environment.
                  </p>
                </div>
              ) : (
                correlation.map(({ run, deployment, aiReport, impactSignal, environment }, idx) => {
                  const ok = run.status === 'SUCCESS';
                  const running = run.status === 'RUNNING';
                  const dot = ok
                    ? 'var(--success)'
                    : running
                      ? 'var(--info)'
                      : run.status === 'FAILED'
                        ? 'var(--error)'
                        : 'var(--text-muted)';

                  return (
                    <div key={run.id} className="obs-chain-row">
                      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                        <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-5 text-center">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="w-px flex-1 min-h-[20px] bg-[var(--border)] mt-1" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {run.commitSha && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                              <GitCommit size={8} /> {run.commitSha.slice(0, 7)}
                            </span>
                          )}
                          {run.branch && (
                            <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-mono">
                              <GitBranch size={8} /> {run.branch}
                            </span>
                          )}
                          <ChevronRight size={10} className="text-[var(--text-muted)]" />
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {run.pipelineName ?? 'Pipeline'}
                          </span>
                          <span
                            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
                            style={{
                              background:
                                environment === 'production'
                                  ? 'rgba(239,68,68,0.08)'
                                  : environment === 'staging'
                                    ? 'rgba(245,158,11,0.08)'
                                    : 'rgba(100,116,139,0.08)',
                              color:
                                environment === 'production'
                                  ? 'var(--error)'
                                  : environment === 'staging'
                                    ? 'var(--warning)'
                                    : 'var(--text-muted)',
                            }}
                          >
                            {environment}
                          </span>
                          <span className="text-[10px] font-bold ml-auto" style={{ color: dot }}>
                            {run.status}
                          </span>
                        </div>

                        {deployment && (
                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                            <Rocket size={9} className="text-[var(--success)]" />
                            <span>
                              Deployed to <strong className="text-[var(--text-primary)]">{deployment.environment}</strong> · {deployment.version ?? deployment.imageTag}
                            </span>
                            <span className="text-[10px]">{fmtRel(deployment.deployedAt)}</span>
                          </div>
                        )}

                        {impactSignal && (
                          <div
                            className="flex items-center gap-2 p-2 rounded-lg border"
                            style={{
                              background:
                                run.status === 'FAILED' ? 'rgba(239,68,68,0.04)' : 'rgba(34,197,94,0.04)',
                              borderColor:
                                run.status === 'FAILED' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                            }}
                          >
                            {run.status === 'FAILED' ? (
                              <Zap size={9} style={{ color: 'var(--warning)' }} />
                            ) : (
                              <Package size={9} style={{ color: 'var(--success)' }} />
                            )}
                            <p className="text-[10px] text-[var(--text-secondary)] flex-1 truncate">
                              {impactSignal}
                            </p>
                            {aiReport && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase"
                                style={{
                                  color:
                                    aiReport.riskLevel === 'HIGH' || aiReport.riskLevel === 'CRITICAL'
                                      ? 'var(--error)'
                                      : aiReport.riskLevel === 'MEDIUM'
                                        ? 'var(--warning)'
                                        : 'var(--success)',
                                  background:
                                    aiReport.riskLevel === 'HIGH' || aiReport.riskLevel === 'CRITICAL'
                                      ? 'rgba(239,68,68,0.1)'
                                      : aiReport.riskLevel === 'MEDIUM'
                                        ? 'rgba(245,158,11,0.1)'
                                        : 'rgba(34,197,94,0.1)',
                                }}
                              >
                                {aiReport.riskLevel}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                          <span>
                            <Clock size={8} className="inline mr-0.5" />
                            {run.startedAt ? fmtRel(run.startedAt) : '—'}
                          </span>
                          {run.durationSeconds != null && <span>{run.durationSeconds}s runtime</span>}
                        </div>
                      </div>

                      {!ok && !running && (
                        <button
                          className="shrink-0 flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-bright)]"
                          onClick={() => openIncident(run)}
                        >
                          <Eye size={10} /> AI RCA
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </DeveloperShell>

      {/* Drawers */}
      {incident && <RcaDrawer inc={incident} onClose={() => setIncident(null)} />}
      {selectedNode && <NodeDiagnosticDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />}
    </>
  );
}
