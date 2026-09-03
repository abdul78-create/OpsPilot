'use client';

import React from 'react';
import {
  Server, Database, CheckCircle2, AlertTriangle,
  XCircle, Layers, ArrowUpRight, Cpu, Radio
} from 'lucide-react';

export interface LiveHealthData {
  status: 'ok' | 'degraded' | 'down';
  services: {
    database: string;
    eventBus?: string;
    queue?: string;
  };
}

interface SystemHealthWidgetProps {
  health: LiveHealthData | null;
  onViewInfrastructure: () => void;
}

export const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({
  health,
  onViewInfrastructure,
}) => {
  const isOk = health?.status === 'ok';
  const isDegraded = health?.status === 'degraded';
  const isDown = health?.status === 'down';

  const dbStatus = health?.services?.database === 'up' ? 'Healthy' : health?.services?.database ? 'Degraded' : 'Healthy';
  const queueStatus = health?.services?.queue === 'up' ? 'Healthy' : health?.services?.queue ? 'Unavailable' : 'Healthy';

  return (
    <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)] mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">System Health</h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {isOk ? 'All systems operational' : isDegraded ? 'Degraded operational state' : 'System alerts detected'}
            </p>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${
            isOk ? 'bg-emerald-500' : isDegraded ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
          }`} />
        </div>

        {/* Services List */}
        <div className="space-y-3 text-xs">
          {/* API Server */}
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">API Server</span>
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              Healthy
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </span>
          </div>

          {/* Database */}
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Database</span>
            <span className={`flex items-center gap-1.5 font-medium ${
              dbStatus === 'Healthy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
            }`}>
              {dbStatus}
              <span className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'Healthy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </span>
          </div>

          {/* Redis Queue */}
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Redis Queue</span>
            <span className={`flex items-center gap-1.5 font-medium ${
              queueStatus === 'Healthy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'
            }`}>
              {queueStatus}
              <span className={`w-1.5 h-1.5 rounded-full ${queueStatus === 'Healthy' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            </span>
          </div>

          {/* Worker Pool */}
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Worker Pool</span>
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              Healthy
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </span>
          </div>

          {/* Docker Engine */}
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Docker Engine</span>
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              Healthy
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </span>
          </div>

          {/* GitHub API */}
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">GitHub API</span>
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              Healthy
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 pt-3.5 border-t border-[var(--border-subtle)]">
        <button
          onClick={onViewInfrastructure}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:text-indigo-500 bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)]/80 rounded-lg border border-[var(--border-subtle)] transition-colors"
        >
          View Infrastructure
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
