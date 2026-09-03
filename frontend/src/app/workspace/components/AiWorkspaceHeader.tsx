'use client';

import React from 'react';
import { Sparkles, Cpu, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { AiStatusResponse } from '@/lib/apiClient';

interface AiWorkspaceHeaderProps {
  aiStatus: AiStatusResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

export const AiWorkspaceHeader: React.FC<AiWorkspaceHeaderProps> = ({
  aiStatus,
  loading,
  onRefresh,
}) => {
  const isConnected = aiStatus?.status === 'connected';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
          <span>Home</span>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-medium">AI Workspace</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">AI Workspace</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Your intelligent DevOps command center across pipelines, telemetry, deployments, and security
            </p>
          </div>
        </div>
      </div>

      {/* Provider Status Pill */}
      <div className="flex items-center gap-3 self-start sm:self-center">
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] border border-[var(--border-subtle)] transition-colors"
          title="Refresh AI Status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
          isConnected
            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span>
            {aiStatus?.provider || 'OpsPilot Intelligence Engine'} ({aiStatus?.model || 'active'})
          </span>
        </div>
      </div>
    </div>
  );
};
