'use client';

import React from 'react';
import {
  FolderKanban, GitBranch, PlayCircle, Rocket,
  ChevronDown, Layers, Database
} from 'lucide-react';
import { Project, PipelineDefinition, PipelineRun, Deployment } from '@/lib/apiClient';

interface ContextSelectorBarProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;

  pipelines: PipelineDefinition[];
  selectedPipelineId: string;
  onSelectPipeline: (pipelineId: string) => void;

  runs: PipelineRun[];
  selectedRunId: string;
  onSelectRun: (runId: string) => void;

  deployments: Deployment[];
  selectedDeploymentId: string;
  onSelectDeployment: (deploymentId: string) => void;

  mode: 'pipeline' | 'observability' | 'deployment' | 'security';
}

export const ContextSelectorBar: React.FC<ContextSelectorBarProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,

  pipelines,
  selectedPipelineId,
  onSelectPipeline,

  runs,
  selectedRunId,
  onSelectRun,

  deployments,
  selectedDeploymentId,
  onSelectDeployment,

  mode,
}) => {
  return (
    <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-4 text-xs">
      <div className="flex items-center gap-2 text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px] shrink-0">
        <Layers className="w-3.5 h-3.5 text-indigo-500" />
        AI Operational Context:
      </div>

      {/* 1. Project Selector */}
      <div className="flex items-center gap-2 min-w-[180px]">
        <span className="text-[var(--text-muted)] font-medium">Project:</span>
        <div className="relative flex-1">
          <select
            value={selectedProjectId}
            onChange={(e) => onSelectProject(e.target.value)}
            className="w-full appearance-none pl-3 pr-7 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {projects.length === 0 ? (
              <option value="">No projects available</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 2. Pipeline Selector (relevant for pipeline, observability, security) */}
      {(mode === 'pipeline' || mode === 'security' || mode === 'observability') && (
        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="text-[var(--text-muted)] font-medium">Pipeline:</span>
          <div className="relative flex-1">
            <select
              value={selectedPipelineId}
              onChange={(e) => onSelectPipeline(e.target.value)}
              className="w-full appearance-none pl-3 pr-7 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {pipelines.length === 0 ? (
                <option value="">No pipelines in project</option>
              ) : (
                pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      )}

      {/* 3. Run Selector (relevant for observability, security, pipeline) */}
      {(mode === 'observability' || mode === 'security') && (
        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="text-[var(--text-muted)] font-medium">Target Run:</span>
          <div className="relative flex-1">
            <select
              value={selectedRunId}
              onChange={(e) => onSelectRun(e.target.value)}
              className="w-full appearance-none pl-3 pr-7 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-mono"
            >
              {runs.length === 0 ? (
                <option value="">No runs recorded</option>
              ) : (
                runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id.slice(0, 8)} ({r.status} · {r.durationSeconds ? `${r.durationSeconds}s` : 'active'})
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      )}

      {/* 4. Deployment Selector (relevant for deployment advisor) */}
      {mode === 'deployment' && (
        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="text-[var(--text-muted)] font-medium">Release:</span>
          <div className="relative flex-1">
            <select
              value={selectedDeploymentId}
              onChange={(e) => onSelectDeployment(e.target.value)}
              className="w-full appearance-none pl-3 pr-7 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-mono"
            >
              {deployments.length === 0 ? (
                <option value="">No deployments found</option>
              ) : (
                deployments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.version || d.imageTag || 'v1.0.0'} ({d.environment} · {d.status})
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
};
