'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeveloperShellWrapper } from '@/components/layout/DeveloperShell';
import { RepoScannerModal } from '@/components/builder/RepoScannerModal';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import {
  fetchServiceHealth, listAllRuns, listPipelines, listAiReports,
  listProjects, Project, getActiveProjectId, setActiveProjectId,
  PipelineRun, AiAnalysisReport, PipelineDefinition,
} from '@/lib/apiClient';
import {
  Activity, Rocket, CheckCircle2, Clock, GitCommit,
  ArrowUpRight, Play, Zap, Plus, TrendingUp, Server,
  Sparkles, RefreshCw, ArrowRight, ChevronRight,
  Layers, Terminal, FolderPlus, Folder, Check,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ── Helpers ─────────────────────────────────────────────────── */

function timeAgo(iso?: string) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortRepo(url?: string | null) {
  if (!url) return '—';
  try {
    const path = new URL(url).pathname.replace(/^\//, '').replace(/\.git$/, '');
    return path || url;
  } catch {
    return url;
  }
}

function shortSha(sha?: string) {
  return sha ? sha.slice(0, 7) : '—';
}

function formatDuration(secs?: number) {
  if (!secs) return '—';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

/* ── Components ─────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { dot: string; text: string; bg: string; label: string }> = {
    SUCCESS:   { dot: 'bg-[var(--success)]',  text: 'text-[var(--success)]',  bg: 'bg-[var(--success-dim)]',  label: 'Success'   },
    FAILED:    { dot: 'bg-[var(--error)]',     text: 'text-[var(--error)]',    bg: 'bg-[var(--error-dim)]',    label: 'Failed'    },
    RUNNING:   { dot: 'bg-[var(--info)]',      text: 'text-[var(--info)]',     bg: 'bg-[var(--info-dim)]',     label: 'Running'   },
    QUEUED:    { dot: 'bg-[var(--warning)]',   text: 'text-[var(--warning)]',  bg: 'bg-[var(--warning-dim)]',  label: 'Queued'    },
    CANCELLED: { dot: 'bg-[var(--text-muted)]',text: 'text-[var(--text-muted)]',bg: 'bg-[var(--bg-tertiary)]',label: 'Cancelled' },
  };
  const c = cfg[status] ?? cfg.CANCELLED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${c.text} ${c.bg} border border-[var(--border)]`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'RUNNING' ? 'animate-ping' : ''}`} />
      {c.label}
    </span>
  );
}

function KpiCard({
  title, value, subtitle, icon: Icon, trendText, trendUp,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trendText?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 transition-all duration-200 hover:border-[var(--border-bright)] hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{title}</span>
        <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
          <Icon size={15} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-mono">{value}</div>
        {(subtitle || trendText) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--text-muted)]">
            {trendText && (
              <span className={`inline-flex items-center gap-0.5 font-medium ${trendUp ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                <TrendingUp size={12} className={trendUp ? '' : 'rotate-180'} />
                {trendText}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-3 text-xs shadow-[var(--shadow-md)]">
      <p className="text-[var(--text-muted)] font-mono mb-2 border-b border-[var(--border)] pb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[var(--text-secondary)] capitalize">{p.name}:</span>
          </div>
          <span className="font-mono font-bold text-[var(--text-primary)]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Dashboard Page ─────────────────────────────────────── */

export default function DashboardPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [pipelines, setPipelines] = useState<PipelineDefinition[]>([]);
  const [reports, setReports] = useState<AiAnalysisReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [userName, setUserName] = useState('Engineer');
  const [daysFilter, setDaysFilter] = useState<7 | 14 | 30>(7);
  const [systemHealth, setSystemHealth] = useState<{
    isOnline: boolean;
    dbStatus: string;
    queueStatus: string;
    eventBusStatus: string;
  }>({ isOnline: true, dbStatus: 'up', queueStatus: 'up', eventBusStatus: 'up' });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      if (typeof window !== 'undefined') {
        const u = localStorage.getItem('opspilot_user');
        if (u) {
          try {
            const parsed = JSON.parse(u);
            if (parsed.name) setUserName(parsed.name.split(' ')[0]);
          } catch { /* ignore */ }
        }
      }

      const [healthRes, runsRes, pipelinesRes, reportsRes, projectsRes] = await Promise.all([
        fetchServiceHealth().catch(() => null),
        listAllRuns().catch(() => []),
        listPipelines().catch(() => ({ data: [] })),
        listAiReports().catch(() => ({ data: [] })),
        listProjects().catch(() => ({ data: [] })),
      ]);

      if (healthRes) {
        setSystemHealth({
          isOnline: healthRes.status === 'ok',
          dbStatus: healthRes.details?.database || 'unknown',
          queueStatus: healthRes.details?.queue || 'unknown',
          eventBusStatus: healthRes.details?.eventBus || 'unknown',
        });
      } else {
        setSystemHealth({
          isOnline: false,
          dbStatus: 'down',
          queueStatus: 'down',
          eventBusStatus: 'down',
        });
      }

      setRuns(Array.isArray(runsRes) ? runsRes : []);
      setPipelines(pipelinesRes.data ?? []);
      setReports(reportsRes.data ?? []);

      const loadedProjects = projectsRes.data ?? [];
      setProjects(loadedProjects);
      const currentActiveProjId = getActiveProjectId();
      if (currentActiveProjId && loadedProjects.some(p => p.id === currentActiveProjId)) {
        setActiveProjectIdState(currentActiveProjId);
      } else if (loadedProjects.length > 0) {
        setActiveProjectId(loadedProjects[0].id);
        setActiveProjectIdState(loadedProjects[0].id);
      } else {
        setActiveProjectIdState(null);
      }
    } catch {
      setSystemHealth({ isOnline: false, dbStatus: 'down', queueStatus: 'down', eventBusStatus: 'down' });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        loadData(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadData]);

  const totalRuns = runs.length;
  const failedRuns = runs.filter(r => r.status === 'FAILED');
  const runningRuns = runs.filter(r => r.status === 'RUNNING');
  const successfulRuns = runs.filter(r => r.status === 'SUCCESS');
  const successRate = totalRuns > 0 ? (successfulRuns.length / totalRuns) * 100 : null;
  const recentFailedRun = failedRuns[0];

  const chartData = React.useMemo(() => {
    const buckets: Record<string, { success: number; failed: number }> = {};
    const now = Date.now();
    for (let i = daysFilter - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const k = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      buckets[k] = { success: 0, failed: 0 };
    }
    runs.forEach(r => {
      if (!r.startedAt && !r.createdAt) return;
      const d = new Date(r.startedAt || r.createdAt || '');
      const k = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (buckets[k]) {
        if (r.status === 'SUCCESS' || r.status === 'RUNNING') buckets[k].success++;
        else if (r.status === 'FAILED') buckets[k].failed++;
      }
    });
    return Object.entries(buckets).map(([day, v]) => ({ day, ...v }));
  }, [runs, daysFilter]);

  return (
    <DeveloperShellWrapper>
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ── System Health Banner ── */}
        <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${systemHealth.isOnline ? 'bg-[var(--success)]' : 'bg-[var(--error)]'}`} />
              {systemHealth.isOnline && <span className="w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-ping absolute inset-0 opacity-60" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  System Status: {systemHealth.isOnline ? 'All Systems Operational' : 'Degraded Performance'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border)]">v2.4.0</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-3 mt-0.5">
                <span>Database: <strong className={`font-mono ${systemHealth.dbStatus === 'up' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>{systemHealth.dbStatus.toUpperCase()}</strong></span>
                <span>•</span>
                <span>Queue: <strong className={`font-mono ${systemHealth.queueStatus === 'up' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{systemHealth.queueStatus.toUpperCase()}</strong></span>
                <span>•</span>
                <span>Active Workflows: <strong className="text-[var(--info)] font-mono">{runningRuns.length} Running</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-all disabled:opacity-50"
              title="Press 'R' to refresh"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setScanOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] px-3.5 py-1.5 rounded-lg hover:bg-[var(--accent-hover)] transition-all shadow-[var(--shadow-accent)]"
            >
              <Plus size={14} />
              <span>New Pipeline</span>
            </button>
          </div>
        </div>

        {/* ── Greeting Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {greeting}, {userName}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {runningRuns.length > 0
                ? `${runningRuns.length} pipeline run${runningRuns.length > 1 ? 's' : ''} actively executing in Docker environment`
                : totalRuns > 0
                ? 'Zero pipeline failures detected in the last hour. Workspace ready.'
                : 'Welcome to OpsPilot. Connect a repository and build your first automated pipeline.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/builder')}
              className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] px-4 py-2 rounded-lg transition-all"
            >
              <Layers size={14} />
              <span>Pipeline Builder</span>
            </button>
            <button
              onClick={() => router.push('/observability')}
              className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] px-4 py-2 rounded-lg transition-all"
            >
              <Terminal size={14} />
              <span>Live Logs</span>
            </button>
          </div>
        </div>

        {/* ── Failure Alert ── */}
        {recentFailedRun && (
          <div className="rounded-xl bg-[var(--error-dim)] border border-[var(--error)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--error-dim)] text-[var(--error)] shrink-0">
                <Activity size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[var(--error)] uppercase tracking-wider">Action Required — Pipeline Failed</h3>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">{timeAgo(recentFailedRun.startedAt || recentFailedRun.createdAt)}</span>
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                  {shortRepo(recentFailedRun.repositoryUrl)}{' '}
                  <span className="text-[var(--text-muted)] font-normal">on branch</span>{' '}
                  <code className="text-[var(--text-secondary)] font-mono text-xs">{recentFailedRun.branch || 'main'}</code>
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/runs/${recentFailedRun.id}`)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--error)] bg-[var(--error-dim)] hover:opacity-80 border border-[var(--error)] px-4 py-2 rounded-lg transition-all shrink-0"
            >
              <Sparkles size={14} />
              <span>Run AI Root Cause Analysis</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* ── Projects Section ── */}
        <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                <Folder size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Projects</h3>
                <p className="text-xs text-[var(--text-muted)]">Active microservices & workload contexts</p>
              </div>
            </div>
            <button
              onClick={() => setCreateProjectOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] px-3.5 py-1.5 rounded-lg transition-all hover:opacity-85 shadow-sm"
            >
              <Plus size={13} />
              <span>{projects.length === 0 ? 'Create Project' : 'New Project'}</span>
            </button>
          </div>

          {loading ? (
            <div className="h-16 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
          ) : projects.length === 0 ? (
            <div className="py-8 px-4 rounded-lg bg-[var(--bg-primary)] border border-dashed border-[var(--border-bright)] text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                <FolderPlus size={18} />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Welcome to OpsPilot</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Create your first project to connect a repository and start building pipelines.
                </p>
              </div>
              <button
                onClick={() => setCreateProjectOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 rounded-lg hover:bg-[var(--accent-hover)] transition-all shadow-sm"
              >
                <Plus size={13} />
                <span>+ Create Project</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {projects.map((proj) => {
                const isActive = activeProjectId === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setActiveProjectId(proj.id);
                      setActiveProjectIdState(proj.id);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between space-y-3 ${
                      isActive
                        ? 'bg-[var(--bg-tertiary)] border-[var(--border-bright)] shadow-sm'
                        : 'bg-[var(--bg-primary)] border-[var(--border)] hover:border-[var(--border-bright)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">{proj.name}</span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--success-dim)] border border-[var(--success)] text-[var(--success)] font-semibold">
                              <Check size={10} /> Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-[var(--text-muted)] truncate mt-0.5">{proj.slug}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[11px]">
                      <span className="text-[var(--text-muted)]">{proj.environments?.length ?? 0} envs</span>
                      <div className="flex items-center gap-2">
                        <Link
                          href="/repositories"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveProjectId(proj.id);
                          }}
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                        >
                          Repos
                        </Link>
                        <span className="text-[var(--border)]">•</span>
                        <Link
                          href="/pipelines"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveProjectId(proj.id);
                          }}
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                        >
                          Pipelines
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] animate-pulse p-5 space-y-3">
                <div className="h-3 w-20 bg-[var(--bg-tertiary)] rounded" />
                <div className="h-8 w-16 bg-[var(--bg-tertiary)] rounded" />
              </div>
            ))
          ) : (
            <>
              <KpiCard
                title="Total Executions"
                value={totalRuns}
                subtitle={totalRuns > 0 ? "Across all pipelines" : "No executions recorded"}
                icon={Play}
              />
              <KpiCard
                title="Success Rate"
                value={successRate !== null ? `${successRate.toFixed(1)}%` : '—'}
                subtitle={totalRuns > 0 ? "Computed from live runs" : "No runs recorded yet"}
                icon={CheckCircle2}
                trendText={successRate !== null ? (successRate >= 90 ? 'Healthy' : 'Needs Review') : undefined}
                trendUp={successRate !== null ? successRate >= 90 : undefined}
              />
              <KpiCard
                title="Active Workflows"
                value={pipelines.length}
                subtitle={runningRuns.length > 0 ? `${runningRuns.length} currently running` : `${pipelines.length} configured`}
                icon={Rocket}
              />
              <KpiCard
                title="AI RCA Incidents"
                value={reports.length}
                subtitle={reports.length > 0 ? "Root cause reports saved" : "No incidents analyzed"}
                icon={Sparkles}
              />
            </>
          )}
        </div>

        {/* ── Activity Chart & Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Chart */}
          <div className="lg:col-span-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Pipeline Execution History</h3>
                <p className="text-xs text-[var(--text-muted)]">Distribution of successful vs failed runs over time</p>
              </div>
              <div className="flex items-center gap-1">
                {([7, 14, 30] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDaysFilter(d)}
                    className={`text-xs font-mono px-2.5 py-1 rounded-md transition-all ${
                      daysFilter === d
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-bold'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border)]'
                    }`}
                  >
                    {d}D
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="h-56 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--text-primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--text-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--error)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--error)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="success" name="Success" stroke="var(--text-primary)" fill="url(#colorSuccess)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="failed" name="Failed" stroke="var(--error)" fill="url(#colorFailed)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Zap size={14} className="text-[var(--warning)]" />
              <span>Quick Actions</span>
            </h3>

            <div className="space-y-2">
              {[
                { label: 'Create Project', desc: 'Provision project workspace', icon: FolderPlus, action: () => setCreateProjectOpen(true) },
                { label: 'Import Repository', desc: 'Scan & generate CI/CD YAML', icon: GitCommit, action: () => setScanOpen(true) },
                { label: 'New Pipeline', desc: 'Visual workflow node graph', icon: Plus, action: () => router.push('/builder') },
                { label: 'Manage Secrets', desc: 'Encrypted environment variables', icon: Server, action: () => router.push('/secrets') },
                { label: 'AI Incident Audit', desc: 'View past root cause reports', icon: Sparkles, action: () => router.push('/ai') },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full text-left p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                      <item.icon size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{item.label}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-[var(--border-bright)] group-hover:text-[var(--text-muted)] transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Recent Runs ── */}
        <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Execution History</h3>
              <p className="text-xs text-[var(--text-muted)]">Live feed of pipeline runs triggered across projects</p>
            </div>
            <Link href="/runs" className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors">
              <span>View all runs</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                <Play size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)]">No pipeline executions yet</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">Import a GitHub repository to trigger your first build.</p>
              </div>
              <button
                onClick={() => setScanOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 rounded-lg transition-all"
              >
                <Plus size={13} />
                <span>Import Repository</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)] overflow-x-auto">
              {runs.slice(0, 8).map(run => (
                <div
                  key={run.id}
                  onClick={() => router.push(`/runs/${run.id}`)}
                  className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-[var(--bg-tertiary)] rounded-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <StatusBadge status={run.status} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">
                        {shortRepo(run.repositoryUrl)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                        <span className="flex items-center gap-1">
                          <GitCommit size={11} /> {shortSha(run.commitSha)}
                        </span>
                        <span>•</span>
                        <span>{run.branch ?? '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0 text-xs font-mono text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDuration(run.durationSeconds)}
                    </span>
                    <span className="text-[11px]">{timeAgo(run.startedAt || run.createdAt)}</span>
                    <ChevronRight size={13} className="text-[var(--border-bright)] group-hover:text-[var(--text-muted)] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Repo Import Modal */}
      {scanOpen && (
        <RepoScannerModal
          open={scanOpen}
          onClose={() => setScanOpen(false)}
          onImportComplete={() => {
            setScanOpen(false);
            loadData(true);
          }}
        />
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        open={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onProjectCreated={() => {
          setCreateProjectOpen(false);
          loadData(true);
        }}
      />
    </DeveloperShellWrapper>
  );
}
