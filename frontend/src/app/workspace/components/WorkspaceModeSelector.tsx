'use client';

import React from 'react';
import { GitBranch, Activity, Rocket, Shield, Sparkles, Check } from 'lucide-react';

export type WorkspaceMode = 'pipeline' | 'observability' | 'deployment' | 'security';

interface WorkspaceModeSelectorProps {
  selectedMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
}

export const WORKSPACE_MODES = [
  {
    id: 'pipeline' as const,
    name: 'Pipeline Genius',
    tagline: 'CI/CD Workflow & DAG Optimization',
    description: 'Analyze pipeline bottlenecks, detect caching opportunities, and generate production DAGs with AI.',
    icon: GitBranch,
    color: 'from-blue-500/20 to-indigo-500/10',
    borderColor: 'border-blue-500/40',
    accent: 'text-blue-500',
    capabilities: ['Bottleneck Detection', 'Caching Advisor', 'AI DAG Generator'],
  },
  {
    id: 'observability' as const,
    name: 'Observability Sage',
    tagline: 'Failure RCA & Live Log Intelligence',
    description: 'Investigate failed pipeline runs, analyze real execution logs, extract root causes, and propose isolated fix branches.',
    icon: Activity,
    color: 'from-indigo-500/20 to-purple-500/10',
    borderColor: 'border-indigo-500/40',
    accent: 'text-indigo-500',
    capabilities: ['Root Cause Analysis', 'Log Diagnostics', 'Patch Proposer'],
  },
  {
    id: 'deployment' as const,
    name: 'Deployment Advisor',
    tagline: 'Release Risk Scoring & Rollout Safety',
    description: 'Evaluate pre-deployment risk scores (0-100), audit environment approval requirements, and monitor health probes.',
    icon: Rocket,
    color: 'from-purple-500/20 to-pink-500/10',
    borderColor: 'border-purple-500/40',
    accent: 'text-purple-500',
    capabilities: ['Risk Evaluation', 'Rollout Guard', 'Health Probe Audit'],
  },
  {
    id: 'security' as const,
    name: 'Security Sentinel',
    tagline: 'Vulnerability Scanning & Vault Compliance',
    description: 'Audit pipeline configurations and job logs for plaintext secret exposures, weak permissions, and unpinned dependencies.',
    icon: Shield,
    color: 'from-emerald-500/20 to-teal-500/10',
    borderColor: 'border-emerald-500/40',
    accent: 'text-emerald-500',
    capabilities: ['Secret Leak Audit', 'SAST Analysis', 'Vault Compliance'],
  },
];

export const WorkspaceModeSelector: React.FC<WorkspaceModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
      {WORKSPACE_MODES.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;

        return (
          <div
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            className={`relative p-5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              isSelected
                ? `bg-gradient-to-br ${mode.color} ${mode.borderColor} shadow-md ring-1 ring-indigo-500/30`
                : 'bg-[var(--surface-primary)] border-[var(--border-subtle)] hover:border-indigo-500/40 hover:bg-[var(--surface-secondary)]/40 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-indigo-500 text-white shadow-sm' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                {isSelected ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    <Check className="w-3 h-3" />
                    Active
                  </span>
                ) : (
                  <span className="text-[11px] text-[var(--text-muted)] font-medium">
                    Ready
                  </span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{mode.name}</h3>
              <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">{mode.tagline}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                {mode.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]/60 flex flex-wrap gap-1.5">
              {mode.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-secondary)] text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]/50"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
