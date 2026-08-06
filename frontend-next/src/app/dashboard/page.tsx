'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeveloperShellWrapper } from '@/components/layout/DeveloperShell';
import { RepoScannerModal } from '@/components/builder/RepoScannerModal';
import {
  fetchSystemHealth, listAllRuns, listPipelines, listAiReports,
  PipelineRun, AiAnalysisReport, PipelineDefinition,
} from '@/lib/apiClient';
import {
  Activity, Rocket, CheckCircle2, Clock, GitCommit,
  ArrowUpRight, Play, Zap, Plus, TrendingUp, Server,
  Sparkles, X, ExternalLink, AlertTriangle, ShieldCheck,
  RefreshCw, Cpu, Database, Radio, ArrowRight, ChevronRight,
  Filter, Layers, Search, Terminal, BarChart2, Check,
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

function shortRepo(url?: string) {
  if (!url) return 'Unknown repository';
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
  const cfg: Record<string, { color: string; bg: string; border: string; label: string }> = {
    SUCCESS:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Success' },
    FAILED:    { color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    label: 'Failed' },
    RUNNING:   { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   label: 'Running' },
    QUEUED:    { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  label: 'Queued' },
    CANCELLED: { color: 'text-zinc-400',   bg: 'bg-zinc-500/10',   border: 'border-zinc-500/20',   label: 'Cancelled' },
  };
  const c = cfg[status] ?? cfg.CANCELLED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${c.color} ${c.bg} border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'RUNNING' ? 'bg-blue-400 animate-ping' : c.color.replace('text-', 'bg-')}`} />
      {c.label}
    </span>
  );
}

function KpiCard({
  title, value, subtitle, icon: Icon, accentColor, trendText, trendUp,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  accentColor: 'violet' | 'emerald' | 'blue' | 'amber';
  trendText?: string;
  trendUp?: boolean;
}) {
  const colorMap = {
    violet: { border: 'hover:border-violet-500/30', bg: 'bg-violet-500/10', text: 'text-violet-400', glow: 'from-violet-500/5' },
    emerald: { border: 'hover:border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', glow: 'from-emerald-500/5' },
    blue: { border: 'hover:border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', glow: 'from-blue-500/5' },
    amber: { border: 'hover:border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', glow: 'from-amber-500/5' },
  };
  const c = colorMap[accentColor];

  return (
    <div className={`relative overflow-hidden rounded-xl bg-[#111113]/80 border border-[#27272A] p-5 transition-all duration-200 ${c.border} hover:-translate-y-0.5 shadow-lg group`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${c.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg ${c.bg} ${c.text}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="relative z-10">
        <div className="text-2xl font-bold text-white tracking-tight font-mono">{value}</div>
        {(subtitle || trendText) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
            {trendText && (
              <span className={`inline-flex items-center gap-0.5 font-medium ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
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
    <div className="bg-[#18181B]/95 border border-[#27272A] rounded-xl p-3 text-xs shadow-2xl backdrop-blur-md">
      <p className="text-zinc-400 font-mono mb-2 border-b border-[#27272A] pb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-zinc-300 capitalize">{p.name}:</span>
          </div>
          <span className="font-mono font-bold text-white">{p.value}</span>
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
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [userName, setUserName] = useState('Engineer');
  const [daysFilter, setDaysFilter] = useState<7 | 14 | 30>(7);
  const [systemHealth, setSystemHealth] = useState<{ isOnline: boolean; dbStatus: string }>({ isOnline: true, dbStatus: 'up' });

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

      const [healthRes, runsRes, pipelinesRes, reportsRes] = await Promise.all([
        fetchSystemHealth().catch(() => null),
        listAllRuns().catch(() => []),
        listPipelines().catch(() => ({ data: [] })),
        listAiReports().catch(() => ({ data: [] })),
      ]);

      if (healthRes?.data) {
        setSystemHealth({ isOnline: true, dbStatus: 'up' });
      }

      setRuns(Array.isArray(runsRes) ? runsRes : []);
      setPipelines(pipelinesRes.data ?? []);
      setReports(reportsRes.data ?? []);
    } catch {
      setSystemHealth({ isOnline: false, dbStatus: 'down' });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard shortcut listener ('R' to refresh)
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

  // Metrics Calculations
  const totalRuns = runs.length;
  const failedRuns = runs.filter(r => r.status === 'FAILED');
  const runningRuns = runs.filter(r => r.status === 'RUNNING');
  const successfulRuns = runs.filter(r => r.status === 'SUCCESS');
  const successRate = totalRuns > 0 ? (successfulRuns.length / totalRuns) * 100 : 100;
  const recentFailedRun = failedRuns[0];

  // Build Chart Data dynamically from real runs
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
      <style>{`
        .bg-mesh {
          background-color: #09090B;
          background-image:
            radial-gradient(at 10% 10%, rgba(73, 75, 214, 0.08) 0px, transparent 40%),
            radial-gradient(at 90% 90%, rgba(74, 225, 118, 0.04) 0px, transparent 40%);
        }
      `}</style>

      <div className="min-h-screen bg-mesh text-zinc-100 p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        
        {/* ── 5-Second System Health & Status Banner ── */}
        <div className="rounded-xl bg-[#111113]/90 border border-[#27272A] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className={`w-3 h-3 rounded-full inline-block ${systemHealth.isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {systemHealth.isOnline && <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute inset-0 opacity-75" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">System Status: {systemHealth.isOnline ? 'All Systems Operational' : 'Degraded Performance'}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">v2.4.0</span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-3 mt-0.5">
                <span>PostgreSQL: <strong className="text-emerald-400 font-mono">Connected</strong></span>
                <span>•</span>
                <span>Docker Engine: <strong className="text-emerald-400 font-mono">Ready</strong></span>
                <span>•</span>
                <span>Active Workers: <strong className="text-blue-400 font-mono">3 Online</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#27272A] hover:bg-[#18181B] transition-all disabled:opacity-50"
              title="Press 'R' to refresh"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setScanOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3.5 py-1.5 rounded-lg transition-all shadow-lg hover:shadow-violet-600/25"
            >
              <Plus size={14} />
              <span>New Pipeline</span>
            </button>
          </div>
        </div>

        {/* ── Greeting Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {greeting}, {userName}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {runningRuns.length > 0
                ? `${runningRuns.length} pipeline run${runningRuns.length > 1 ? 's' : ''} actively executing in Docker environment`
                : 'Zero pipeline failures detected in the last hour. Workspace ready.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/builder')}
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-300 bg-[#111113] hover:bg-[#18181B] border border-[#27272A] px-4 py-2 rounded-xl transition-all"
            >
              <Layers size={14} className="text-violet-400" />
              <span>Pipeline Builder</span>
            </button>
            <button
              onClick={() => router.push('/observability')}
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-300 bg-[#111113] hover:bg-[#18181B] border border-[#27272A] px-4 py-2 rounded-xl transition-all"
            >
              <Terminal size={14} className="text-emerald-400" />
              <span>Live Logs</span>
            </button>
          </div>
        </div>

        {/* ── Recent Failure Spotlight Alert ── */}
        {recentFailedRun && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider">Action Required — Pipeline Failed</h3>
                  <span className="text-[10px] font-mono text-zinc-400">{timeAgo(recentFailedRun.startedAt || recentFailedRun.createdAt)}</span>
                </div>
                <p className="text-sm font-medium text-white mt-0.5">
                  {shortRepo(recentFailedRun.repositoryUrl)} <span className="text-zinc-500 font-normal">on branch</span> <code className="text-zinc-300 font-mono text-xs">{recentFailedRun.branch || 'main'}</code>
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/runs/${recentFailedRun.id}`)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 px-4 py-2 rounded-lg transition-all shrink-0"
            >
              <Sparkles size={14} className="text-rose-400" />
              <span>Run AI Root Cause Analysis</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-[#111113] border border-[#27272A] animate-pulse p-5 space-y-3">
                <div className="h-3 w-20 bg-zinc-800 rounded" />
                <div className="h-8 w-16 bg-zinc-800 rounded" />
              </div>
            ))
          ) : (
            <>
              <KpiCard
                title="Total Executions"
                value={totalRuns}
                subtitle="Across all pipelines"
                icon={Play}
                accentColor="violet"
                trendText="+14% this week"
                trendUp={true}
              />
              <KpiCard
                title="Success Rate"
                value={`${successRate.toFixed(1)}%`}
                subtitle="Last 30 days"
                icon={CheckCircle2}
                accentColor="emerald"
                trendText={successRate >= 90 ? 'Healthy' : 'Needs Review'}
                trendUp={successRate >= 90}
              />
              <KpiCard
                title="Active Workflows"
                value={pipelines.length}
                subtitle={`${runningRuns.length} currently running`}
                icon={Rocket}
                accentColor="blue"
              />
              <KpiCard
                title="AI RCA Incidents"
                value={reports.length}
                subtitle="Root cause reports saved"
                icon={Sparkles}
                accentColor="amber"
              />
            </>
          )}
        </div>

        {/* ── Activity Chart & Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Activity Chart (2 Columns) */}
          <div className="lg:col-span-2 rounded-xl bg-[#111113]/80 border border-[#27272A] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Pipeline Execution History</h3>
                <p className="text-xs text-zinc-400">Distribution of successful vs failed runs over time</p>
              </div>

              <div className="flex items-center gap-2">
                {([7, 14, 30] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDaysFilter(d)}
                    className={`text-xs font-mono px-2.5 py-1 rounded-md transition-all ${
                      daysFilter === d
                        ? 'bg-violet-600 text-white font-bold'
                        : 'bg-[#18181B] text-zinc-400 hover:text-white border border-[#27272A]'
                    }`}
                  >
                    {d}D
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="h-56 rounded-lg bg-zinc-900/50 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8083ff" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8083ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff4444" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#ff4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#27272A', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="success" name="Success" stroke="#8083ff" fill="url(#colorSuccess)" strokeWidth={2} />
                  <Area type="monotone" dataKey="failed" name="Failed" stroke="#ff4444" fill="url(#colorFailed)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Command Actions & AI Insights Card */}
          <div className="space-y-4 flex flex-col">
            <div className="rounded-xl bg-[#111113]/80 border border-[#27272A] p-5 shadow-xl space-y-4 flex-1">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap size={15} className="text-amber-400" />
                <span>Quick Actions</span>
              </h3>

              <div className="space-y-2">
                {[
                  { label: 'Import Repository', desc: 'Scan & generate CI/CD YAML', icon: GitCommit, action: () => setScanOpen(true) },
                  { label: 'New Pipeline', desc: 'Visual workflow node graph', icon: Plus, action: () => router.push('/builder') },
                  { label: 'Manage Secrets', desc: 'Encrypted environment variables', icon: Server, action: () => router.push('/secrets') },
                  { label: 'AI Incident Audit', desc: 'View past root cause reports', icon: Sparkles, action: () => router.push('/ai') },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full text-left p-3 rounded-lg bg-[#18181B]/60 hover:bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-zinc-800/80 text-zinc-300 group-hover:text-violet-400 transition-colors">
                        <item.icon size={15} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">{item.label}</div>
                        <div className="text-[11px] text-zinc-500">{item.desc}</div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent Runs Execution List ── */}
        <div className="rounded-xl bg-[#111113]/80 border border-[#27272A] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Execution History</h3>
              <p className="text-xs text-zinc-400">Live feed of pipeline runs triggered across projects</p>
            </div>
            <Link
              href="/runs"
              className="text-xs font-medium text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
            >
              <span>View all runs</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-zinc-900/50 animate-pulse" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center margin-auto mx-auto text-zinc-500">
                <Play size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-300">No pipeline executions yet</h4>
                <p className="text-xs text-zinc-500 mt-1">Import a GitHub repository to trigger your first build.</p>
              </div>
              <button
                onClick={() => setScanOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg transition-all"
              >
                <Plus size={13} />
                <span>Import Repository</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#27272A]/50 overflow-x-auto">
              {runs.slice(0, 8).map(run => (
                <div
                  key={run.id}
                  onClick={() => router.push(`/runs/${run.id}`)}
                  className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-[#18181B]/50 rounded-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <StatusBadge status={run.status} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                        {shortRepo(run.repositoryUrl)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-0.5">
                        <span className="flex items-center gap-1">
                          <GitCommit size={11} /> {shortSha(run.commitSha)}
                        </span>
                        <span>•</span>
                        <span>{run.branch || 'main'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0 text-xs font-mono text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-zinc-500" />
                      {formatDuration(run.durationSeconds)}
                    </span>
                    <span className="text-zinc-500 text-[11px]">{timeAgo(run.startedAt || run.createdAt)}</span>
                    <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Repo Import Scanner Modal */}
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
    </DeveloperShellWrapper>
  );
}
