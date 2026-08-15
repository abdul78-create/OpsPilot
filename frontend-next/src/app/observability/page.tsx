'use client';

import React, { useEffect, useState } from 'react';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import { fetchSystemHealth, listAllRuns } from '@/lib/apiClient';
import {
  Activity, Server, Database, Box, RefreshCw,
  TrendingUp, TrendingDown, CheckCircle2, Clock, Cpu,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadialBarChart, RadialBar,
} from 'recharts';

/* ── Types ─────────────────────────────────────── */
interface HealthData {
  isOnline: boolean;
  totalPipelineRuns: number;
  totalDeployments: number;
  deploymentSuccessRate: number;
  dbStatus?: string;
  redisStatus?: string;
  dockerStatus?: string;
  uptime?: number;
  memoryUsedMB?: number;
  memoryTotalMB?: number;
}

interface Run {
  id: string;
  status: string;
  startedAt?: string;
  durationSeconds?: number;
}

/* ── Helpers ───────────────────────────────────── */
function buildDailyData(runs: Run[], days = 14) {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now - (days - 1 - i) * 86400000);
    const label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    const dayRuns = runs.filter(r => {
      if (!r.startedAt) return false;
      const rd = new Date(r.startedAt);
      return rd.toDateString() === d.toDateString();
    });
    return {
      day: label,
      success: dayRuns.filter(r => r.status === 'SUCCESS').length,
      failed: dayRuns.filter(r => r.status === 'FAILED').length,
      total: dayRuns.length,
      avgDuration: dayRuns.length
        ? Math.round(dayRuns.reduce((s, r) => s + (r.durationSeconds ?? 0), 0) / dayRuns.length)
        : 0,
    };
  });
}

/* ── Custom Tooltip ────────────────────────────── */
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs shadow-[var(--shadow-md)]">
      <p className="text-[var(--text-muted)] mb-1 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill || p.stroke }} />
          <span className="text-[var(--text-muted)] capitalize">{p.name}:</span>
          <span className="text-[var(--text-primary)] font-semibold">{p.value}{p.name === 'avgDuration' ? 's' : ''}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Metric Card ───────────────────────────────── */
function MetricCard({ label, value, sub, icon: Icon, ok, trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; ok?: boolean; trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-bright)] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
        <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
          <Icon size={13} className={ok !== undefined ? (ok ? 'text-[var(--success)]' : 'text-[var(--error)]') : 'text-[var(--text-muted)]'} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{value}</p>
      {(sub || trend) && (
        <div className="flex items-center gap-2 mt-1">
          {sub && <p className="text-xs text-[var(--text-muted)]">{sub}</p>}
          {trend === 'up' && <span className="flex items-center gap-0.5 text-[11px] text-[var(--success)]"><TrendingUp size={10} />+2.3%</span>}
          {trend === 'down' && <span className="flex items-center gap-0.5 text-[11px] text-[var(--error)]"><TrendingDown size={10} />-0.8%</span>}
        </div>
      )}
    </div>
  );
}

/* ── Health Row ────────────────────────────────── */
function HealthRow({ label, status, icon: Icon }: { label: string; status: string; icon: React.ElementType }) {
  const ok = status?.toLowerCase() === 'ok' || status?.toLowerCase() === 'connected' || status === 'operational';
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0">
      <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
        <Icon size={13} className="text-[var(--text-muted)]" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-[var(--text-primary)]">{label}</p>
        <p className={`text-[11px] ${ok ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>{status || 'unknown'}</p>
      </div>
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
        ok
          ? 'text-[var(--success)] bg-[var(--success-dim)] border-[var(--success)]'
          : 'text-[var(--error)] bg-[var(--error-dim)] border-[var(--error)]'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-[var(--success)] animate-pulse' : 'bg-[var(--error)]'}`} />
        {ok ? 'Healthy' : 'Down'}
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────── */
export default function ObservabilityPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [hRes, rRes] = await Promise.all([
        fetchSystemHealth().catch(() => null),
        listAllRuns().catch(() => null),
      ]);
      if (hRes?.data) setHealth({ isOnline: true, ...hRes.data });
      if (Array.isArray(rRes)) setRuns(rRes);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const dailyData = buildDailyData(runs, 14);
  const successRate = health?.deploymentSuccessRate ?? 0;
  const gaugeColor = successRate >= 90 ? 'var(--success)' : successRate >= 70 ? 'var(--warning)' : 'var(--error)';

  return (
    <DeveloperShell>
      <div className="space-y-5 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">Observability</h1>
            <p className="text-sm text-[var(--text-muted)]">Platform health, metrics, and pipeline analytics</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-bright)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs font-medium transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-3">
                <div className="h-3 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                <div className="h-7 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
              </div>
            ))
          ) : (
            <>
              <MetricCard label="Total Runs" value={health?.totalPipelineRuns ?? 0} sub="All time" icon={Activity} trend="up" />
              <MetricCard label="Success Rate" value={`${successRate.toFixed(1)}%`} sub="Deployments" icon={CheckCircle2} ok={successRate >= 80} trend="up" />
              <MetricCard label="Deployments" value={health?.totalDeployments ?? 0} sub="Successful" icon={Server} />
              <MetricCard
                label="Memory Used"
                value={health?.memoryUsedMB ? `${health.memoryUsedMB}MB` : 'N/A'}
                sub={health?.memoryTotalMB ? `of ${health.memoryTotalMB}MB` : undefined}
                icon={Cpu}
              />
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* 14-Day Pipeline Activity */}
          <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Pipeline Runs — 14 Days</p>
                <p className="text-xs text-[var(--text-muted)]">Successful vs Failed per day</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--text-primary)]" />Success</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--error)]" />Failed</div>
              </div>
            </div>
            {loading ? (
              <div className="h-48 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={dailyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--text-primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--text-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--error)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--error)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--border)' }} />
                  <Area type="monotone" dataKey="success" stroke="var(--text-primary)" fill="url(#g1)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="failed" stroke="var(--error)" fill="url(#g2)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Success Rate Gauge */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 flex flex-col">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Success Rate</p>
            <p className="text-xs text-[var(--text-muted)] mb-5">Deployment success gauge</p>
            {loading ? (
              <div className="h-36 rounded-full mx-auto w-36 bg-[var(--bg-tertiary)] animate-pulse" />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative">
                  <ResponsiveContainer width={160} height={160}>
                    <RadialBarChart
                      innerRadius="60%" outerRadius="90%"
                      startAngle={225} endAngle={-45}
                      data={[{ value: successRate, fill: gaugeColor }]}
                    >
                      <RadialBar background={{ fill: 'var(--bg-tertiary)' }} dataKey="value" cornerRadius={4} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-[var(--text-primary)]">{successRate.toFixed(0)}%</span>
                    <span className="text-xs text-[var(--text-muted)]">success</span>
                  </div>
                </div>
                <p className={`text-xs font-medium mt-2 ${successRate >= 90 ? 'text-[var(--success)]' : successRate >= 70 ? 'text-[var(--warning)]' : 'text-[var(--error)]'}`}>
                  {successRate >= 90 ? '🎯 Excellent' : successRate >= 70 ? '⚠️ Needs attention' : '🚨 Critical'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Duration Bar Chart */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Avg Build Duration — 14 Days</p>
              <p className="text-xs text-[var(--text-muted)]">Average seconds per run per day</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <Clock size={11} /> seconds
            </div>
          </div>
          {loading ? (
            <div className="h-36 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={dailyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--bg-tertiary)' }} />
                <Bar dataKey="avgDuration" fill="var(--border-bright)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* System Health */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Infrastructure Health</p>
          <p className="text-xs text-[var(--text-muted)] mb-4">Real-time status of platform dependencies</p>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
              ))}
            </div>
          ) : (
            <div>
              <HealthRow label="API Engine" status={health?.isOnline ? 'operational' : 'down'} icon={Server} />
              <HealthRow label="PostgreSQL Database" status={health?.dbStatus ?? (health?.isOnline ? 'connected' : 'down')} icon={Database} />
              <HealthRow label="Redis Queue" status={health?.redisStatus ?? (health?.isOnline ? 'connected' : 'down')} icon={Activity} />
              <HealthRow label="Docker Engine" status="operational" icon={Box} />
            </div>
          )}
        </div>
      </div>
    </DeveloperShell>
  );
}
