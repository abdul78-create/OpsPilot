'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeveloperShellWrapper } from '@/components/layout/DeveloperShell';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import {
  fetchServiceHealth, listAllRuns, listProjects, listDeployments,
  PipelineRun, Project, Deployment,
} from '@/lib/apiClient';
import { useApp } from '@/context/AppContext';
import { Plus, GitBranch } from 'lucide-react';

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

function formatDuration(secs?: number) {
  if (!secs) return '—';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function StatusPill({ status }: { status: string }) {
  const isSuccess = status === 'SUCCESS';
  const isFailed = status === 'FAILED';
  const isRunning = status === 'RUNNING';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
        isSuccess
          ? 'bg-[var(--success-dim)] text-[var(--success)]'
          : isFailed
          ? 'bg-[var(--error-dim)] text-[var(--error)]'
          : isRunning
          ? 'bg-[var(--info-dim)] text-[var(--info)]'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isSuccess ? 'bg-[var(--success)]' : isFailed ? 'bg-[var(--error)]' : isRunning ? 'bg-[var(--info)] animate-ping' : 'bg-[var(--text-muted)]'
        }`}
      />
      <span>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
    </span>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useApp();
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<{
    isOnline: boolean;
    dbStatus: string;
    queueStatus: string;
  }>({ isOnline: true, dbStatus: 'up', queueStatus: 'up' });

  const userName = user?.name ? user.name.split(' ')[0] : 'Engineer';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const loadData = useCallback(async () => {
    try {

      const [healthRes, runsRes, projectsRes, depsRes] = await Promise.all([
        fetchServiceHealth().catch(() => null),
        listAllRuns().catch(() => []),
        listProjects().catch(() => ({ data: [] })),
        listDeployments().catch(() => ({ data: [] })),
      ]);

      if (healthRes) {
        setSystemHealth({
          isOnline: healthRes.status === 'ok',
          dbStatus: healthRes.details?.database || 'up',
          queueStatus: healthRes.details?.queue || 'up',
        });
      } else {
        setSystemHealth({
          isOnline: false,
          dbStatus: 'down',
          queueStatus: 'down',
        });
      }

      setRuns(Array.isArray(runsRes) ? runsRes : []);
      setProjects(projectsRes.data ?? []);
      setDeployments(depsRes.data ?? []);
    } catch {
      setSystemHealth({ isOnline: false, dbStatus: 'down', queueStatus: 'down' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DeveloperShellWrapper>
      <div className="space-y-8 max-w-5xl">
        {/* ── 1. Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {greeting}, {userName}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              Your engineering delivery overview.
            </p>
          </div>

          <div>
            <button
              onClick={() => setCreateProjectOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-xs"
            >
              <Plus size={14} />
              <span>Create Project</span>
            </button>
          </div>
        </div>

        {/* ── 2. Compact System Status ── */}
        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                systemHealth.isOnline ? 'bg-[var(--success)]' : 'bg-[var(--error)]'
              }`}
            />
            <span className="font-medium text-[var(--text-primary)]">
              {systemHealth.isOnline ? 'Operational' : 'Degraded'}
            </span>
          </div>
          <span className="text-[var(--text-muted)] opacity-30">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-muted)]">Database</span>
            <span className="font-mono text-[var(--text-primary)] uppercase font-medium text-[11px]">
              {systemHealth.dbStatus === 'up' ? 'UP' : 'DOWN'}
            </span>
          </div>
          <span className="text-[var(--text-muted)] opacity-30">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-muted)]">Queue</span>
            <span className="font-mono text-[var(--text-primary)] uppercase font-medium text-[11px]">
              {systemHealth.queueStatus === 'up' ? 'UP' : 'UNAVAILABLE'}
            </span>
          </div>
        </div>

        {/* ── 3. Main Content: Projects ── */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Projects
            </h2>
            {projects.length > 0 && (
              <Link
                href="/projects"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] font-medium transition-colors"
              >
                View all
              </Link>
            )}
          </div>

          {loading ? (
            <div className="h-20 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
          ) : projects.length === 0 ? (
            <div className="p-6 rounded-xl bg-[var(--bg-secondary)] space-y-2">
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                No projects yet
              </div>
              <p className="text-xs text-[var(--text-muted)] max-w-lg leading-relaxed">
                Create your first project to connect a repository and start building pipelines.
              </p>
              <div className="pt-1">
                <button
                  onClick={() => setCreateProjectOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  <span>+ Create Project</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects`}
                  className="p-4 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors block text-decoration-none group shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                      {project.name}
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                      {project.status || 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {project.description || 'No description provided.'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── 4. Main Content: Recent Runs & Deployments Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Recent Runs */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Recent Runs
              </h2>
              {runs.length > 0 && (
                <Link
                  href="/runs"
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] font-medium transition-colors"
                >
                  View all
                </Link>
              )}
            </div>

            {loading ? (
              <div className="h-28 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
            ) : runs.length === 0 ? (
              <div className="p-6 rounded-xl bg-[var(--bg-secondary)] space-y-1">
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  No pipeline runs yet
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Runs will appear here after your first execution.
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-[var(--bg-secondary)] divide-y divide-[var(--border)] overflow-hidden shadow-xs">
                {runs.slice(0, 5).map((run) => (
                  <Link
                    key={run.id}
                    href={`/runs/${run.id}`}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-tertiary)] transition-colors block text-decoration-none"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                          Run #{run.id.slice(0, 8)}
                        </span>
                        <StatusPill status={run.status} />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-mono">
                        <GitBranch size={11} />
                        <span>{run.branch || 'main'}</span>
                        <span>•</span>
                        <span>{timeAgo(run.startedAt || run.createdAt)}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-[11px] font-mono text-[var(--text-muted)]">
                      {formatDuration(run.durationSeconds)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recent Deployments */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Deployments
              </h2>
              {deployments.length > 0 && (
                <Link
                  href="/deployments"
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] font-medium transition-colors"
                >
                  View all
                </Link>
              )}
            </div>

            {loading ? (
              <div className="h-28 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
            ) : deployments.length === 0 ? (
              <div className="p-6 rounded-xl bg-[var(--bg-secondary)] space-y-1">
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  No deployments yet
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Deployments will appear here once promoted to an environment.
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-[var(--bg-secondary)] divide-y divide-[var(--border)] overflow-hidden shadow-xs">
                {deployments.slice(0, 5).map((dep) => (
                  <div
                    key={dep.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[var(--text-primary)] uppercase font-mono">
                          {dep.environment}
                        </span>
                        <StatusPill status={dep.status} />
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                        {dep.imageTag || dep.version || dep.id.slice(0, 8)}
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-[11px] font-mono text-[var(--text-muted)]">
                      {timeAgo(dep.deployedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Create Project Modal */}
        <CreateProjectModal
          open={createProjectOpen}
          onClose={() => setCreateProjectOpen(false)}
          onProjectCreated={() => {
            setCreateProjectOpen(false);
            loadData();
          }}
        />
      </div>
    </DeveloperShellWrapper>
  );
}
