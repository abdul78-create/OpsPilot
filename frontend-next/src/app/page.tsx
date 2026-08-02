'use client';

import React, { useState, useEffect } from 'react';
import { DeveloperShellWrapper } from '@/components/layout/DeveloperShell';
import { RepoScannerModal } from '@/components/builder/RepoScannerModal';
import { fetchSystemHealth, listAllRuns } from '@/lib/apiClient';
import {
  Activity, Rocket, CheckCircle2, XCircle, Clock, GitCommit,
  ArrowUpRight, Play, Zap, Plus, TrendingUp, Server, Database,
  Box, AlertCircle, ExternalLink,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ── Types ─────────────────────────────────────── */
interface Run {
  id: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'QUEUED' | 'CANCELLED';
  repositoryUrl?: string;
  commitSha?: string;
  branch?: string;
  startedAt?: string;
  durationSeconds?: number;
}

interface Metrics {
  totalPipelineRuns: number;
  totalDeployments: number;
  deploymentSuccessRate: number;
  isOnline: boolean;
}

/* ── Helpers ───────────────────────────────────── */
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
  if (!url) return 'Unknown repo';
  try { return new URL(url).pathname.replace(/^\//, '').replace(/\.git$/, ''); } catch { return url; }
}

function shortSha(sha?: string) { return sha ? sha.slice(0, 7) : '—'; }

/* ── Status Badge ──────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string; border: string; dot: string }> = {
    SUCCESS:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    FAILED:    { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-400' },
    RUNNING:   { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    dot: 'bg-blue-400' },
    QUEUED:    { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-400' },
    CANCELLED: { color: 'text-zinc-400',    bg: 'bg-zinc-500/10',    border: 'border-zinc-500/20',    dot: 'bg-zinc-400' },
  };
  const c = cfg[status] ?? cfg.CANCELLED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.color} ${c.bg} border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'RUNNING' ? 'animate-pulse-glow' : ''}`} />
      {status}
    </span>
  );
}

/* ── Stat Card ─────────────────────────────────── */
function StatCard({
  label, value, sub, icon: Icon, gradient, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; gradient: string; trend?: string;
}) {
  return (
    <div className="card-hover group bg-[#111113] border border-[#27272A] rounded-xl p-5 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-[0.08] group-hover:opacity-[0.14] transition-opacity ${gradient}`} />
      <div className="flex items-start justify-between mb-4 relative z-10">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
        <div className={`w-7 h-7 rounded-lg ${gradient} bg-opacity-20 flex items-center justify-center`}>
          <Icon size={14} className="text-white" />
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-2xl font-bold text-white tabular-nums animate-count-up">{value}</p>
        {(sub || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {sub && <p className="text-xs text-zinc-500">{sub}</p>}
            {trend && (
              <span className="flex items-center gap-0.5 text-[11px] text-emerald-400 font-medium">
                <TrendingUp size={10} /> {trend}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Skeleton ──────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-[#111113] border border-[#27272A] rounded-xl p-5 space-y-3">
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton h-7 w-16 rounded" />
      <div className="skeleton h-2.5 w-28 rounded" />
    </div>
  );
}

/* ── Chart Data Generator ──────────────────────── */
function buildChartData(runs: Run[]) {
  const buckets: Record<string, { success: number; failed: number }> = {};
  const now = Date.now();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const k = d.toLocaleDateString('en', { weekday: 'short' });
    buckets[k] = { success: 0, failed: 0 };
  }
  runs.forEach((r) => {
    if (!r.startedAt) return;
    const d = new Date(r.startedAt);
    const k = d.toLocaleDateString('en', { weekday: 'short' });
    if (!buckets[k]) return;
    if (r.status === 'SUCCESS') buckets[k].success++;
    else if (r.status === 'FAILED') buckets[k].failed++;
  });
  return Object.entries(buckets).map(([day, v]) => ({ day, ...v }));
}

/* ── Custom Tooltip ────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-400 capitalize">{p.name}:</span>
          <span className="text-white font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Health Dot ────────────────────────────────── */
function HealthDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-400 animate-pulse-glow' : 'bg-red-400'}`} />
      <span className="text-xs text-zinc-400">{label}</span>
      <span className={`text-[10px] font-medium ml-auto ${ok ? 'text-emerald-400' : 'text-red-400'}`}>{ok ? 'OK' : 'DOWN'}</span>
    </div>
  );
}

/* ── Main Dashboard Page ───────────────────────── */
export default function DashboardPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const load = async () => {
      try {
        const [healthRes, runsRes] = await Promise.all([
          fetchSystemHealth().catch(() => null),
          listAllRuns().catch(() => null),
        ]);
        // fetchSystemHealth returns { data: SystemHealth } directly (no .success)
        if (healthRes?.data) {
          setMetrics({
            totalPipelineRuns: healthRes.data.totalPipelineRuns ?? 0,
            totalDeployments: healthRes.data.totalDeployments ?? 0,
            deploymentSuccessRate: healthRes.data.deploymentSuccessRate ?? 0,
            isOnline: true,
          });
        }
        // listAllRuns returns PipelineRun[] directly (not {success, data})
        if (Array.isArray(runsRes)) {
          setRuns(runsRes.slice(0, 10));
        }
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const chartData = buildChartData(runs);
  const activeRuns = runs.filter(r => r.status === 'RUNNING').length;
  const successRate = metrics?.deploymentSuccessRate ?? 0;

  return (
    <DeveloperShellWrapper>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* ── Greeting Header ── */}
        <div className="flex items-start justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {greeting}, Abdul 👋
            </h1>
            <p className="text-sm text-zinc-500">
              {activeRuns > 0
                ? <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-glow" /> {activeRuns} pipeline{activeRuns > 1 ? 's' : ''} running right now</span>
                : 'Your infrastructure is healthy. Ready to deploy?'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScanOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111113] border border-[#27272A] hover:border-[#3F3F46] text-zinc-300 text-sm font-medium transition-all hover:-translate-y-0.5"
            >
              <Plus size={14} />
              New pipeline
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-violet-500/20">
              <Zap size={14} />
              Quick deploy
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up delay-75">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard label="Total Runs" value={metrics?.totalPipelineRuns ?? 0} sub="All time" icon={Play} gradient="bg-violet-600" trend="+12%" />
              <StatCard label="Success Rate" value={`${successRate.toFixed(1)}%`} sub="Last 30 days" icon={CheckCircle2} gradient="bg-emerald-600" trend="+2.3%" />
              <StatCard label="Deployments" value={metrics?.totalDeployments ?? 0} sub="Total successful" icon={Rocket} gradient="bg-blue-600" />
              <StatCard label="Active Runs" value={activeRuns} sub="Right now" icon={Activity} gradient="bg-cyan-600" />
            </>
          )}
        </div>

        {/* ── Chart + Health Panel ── */}
        <div className="grid lg:grid-cols-3 gap-4 animate-slide-up delay-150">
          {/* Area Chart */}
          <div className="lg:col-span-2 bg-[#111113] border border-[#27272A] rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-white">Pipeline Activity</p>
                <p className="text-xs text-zinc-500">Last 7 days</p>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500" />Success</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Failed</div>
              </div>
            </div>
            {loading ? (
              <div className="skeleton h-40 rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#52525B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#52525B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#27272A', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="success" stroke="#8B5CF6" fill="url(#gSuccess)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="failed" stroke="#EF4444" fill="url(#gFailed)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* System Health */}
          <div className="bg-[#111113] border border-[#27272A] rounded-xl p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-white mb-1">System Health</p>
              <p className="text-xs text-zinc-500">Infrastructure status</p>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-4 rounded" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <HealthDot label="API Engine" ok={metrics?.isOnline ?? false} />
                <HealthDot label="PostgreSQL" ok={metrics?.isOnline ?? false} />
                <HealthDot label="Redis Queue" ok={metrics?.isOnline ?? false} />
                <HealthDot label="Docker Engine" ok={true} />
              </div>
            )}
            <div className="pt-3 border-t border-[#1C1C1F]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" />
                <span className="text-xs text-emerald-400 font-medium">All systems operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent Runs ── */}
        <div className="animate-slide-up delay-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white">Recent Runs</p>
              <p className="text-xs text-zinc-500">Latest pipeline executions</p>
            </div>
            <a href="/runs" className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium">
              View all <ArrowUpRight size={12} />
            </a>
          </div>

          <div className="bg-[#111113] border border-[#27272A] rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="skeleton h-4 w-16 rounded" />
                    <div className="skeleton h-3 flex-1 rounded" />
                    <div className="skeleton h-3 w-20 rounded" />
                    <div className="skeleton h-3 w-12 rounded" />
                  </div>
                ))}
              </div>
            ) : runs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#18181B] flex items-center justify-center mb-3">
                  <Play size={20} className="text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-400 mb-1">No runs yet</p>
                <p className="text-xs text-zinc-600 mb-4">Trigger your first pipeline to get started</p>
                <button
                  onClick={() => setScanOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
                >
                  <Plus size={12} /> Import repository
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#1C1C1F]">
                {runs.map((run) => (
                  <a
                    key={run.id}
                    href={`/runs/${run.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#18181B] transition-colors group"
                  >
                    <StatusBadge status={run.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate">{shortRepo(run.repositoryUrl)}</p>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                        <GitCommit size={11} /> {shortSha(run.commitSha)}
                        {run.branch && <><span className="text-zinc-700">·</span> {run.branch}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-[11px] text-zinc-500">
                      {run.durationSeconds && (
                        <span className="flex items-center gap-1"><Clock size={11} /> {run.durationSeconds}s</span>
                      )}
                      <span>{timeAgo(run.startedAt)}</span>
                      <ExternalLink size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up delay-300">
          {[
            { label: 'Import Repo', icon: GitCommit, href: '#', onClick: () => setScanOpen(true), accent: 'text-violet-400' },
            { label: 'View Logs', icon: Activity, href: '/observability', accent: 'text-blue-400' },
            { label: 'Deployments', icon: Rocket, href: '/deployments', accent: 'text-emerald-400' },
            { label: 'Manage Secrets', icon: Server, href: '/secrets', accent: 'text-amber-400' },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              onClick={action.onClick}
              className="card-hover flex items-center gap-3 p-4 bg-[#111113] border border-[#27272A] rounded-xl hover:border-[#3F3F46] transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#18181B] flex items-center justify-center group-hover:bg-[#27272A] transition-colors shrink-0">
                <action.icon size={15} className={action.accent} />
              </div>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">{action.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Scan Modal */}
      {scanOpen && <RepoScannerModal open={scanOpen} onClose={() => setScanOpen(false)} onImportComplete={() => setScanOpen(false)} />}
    </DeveloperShellWrapper>
  );
}
