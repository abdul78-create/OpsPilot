'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeveloperShellWrapper } from '@/components/layout/DeveloperShell';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { listProjects, setActiveProjectId, getActiveProjectId, Project } from '@/lib/apiClient';
import { Plus, FolderKanban, ArrowRight, GitBranch, Layers, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function ProjectsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProjectsData = useCallback(async () => {
    try {
      const res = await listProjects();
      const loaded = res.data ?? [];
      setProjects(loaded);
      const current = getActiveProjectId();
      if (current && loaded.some((p) => p.id === current)) {
        setActiveId(current);
      } else if (loaded.length > 0) {
        setActiveProjectId(loaded[0].id);
        setActiveId(loaded[0].id);
      }
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjectsData();
  }, [loadProjectsData]);

  const handleSelectProject = (project: Project) => {
    setActiveProjectId(project.id);
    setActiveId(project.id);
    toast({
      kind: 'info',
      title: 'Project activated',
      message: `Active context switched to ${project.name}.`,
    });
  };

  return (
    <DeveloperShellWrapper>
      <div className="space-y-8 max-w-5xl">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Projects
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              Manage engineering workloads and repository environments.
            </p>
          </div>

          <div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-xs"
            >
              <Plus size={14} />
              <span>Create project</span>
            </button>
          </div>
        </div>

        {/* ── Project List ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-32 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />
            <div className="h-32 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--bg-secondary)] text-center space-y-3 max-w-md mx-auto my-12">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <FolderKanban size={20} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                No projects yet
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Create your first project to connect a repository and start building pipelines.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                <span>+ Create your first project</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const isActive = project.id === activeId;
              return (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className={`p-5 rounded-2xl bg-[var(--bg-secondary)] border transition-all cursor-pointer shadow-xs relative ${
                    isActive
                      ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/30'
                      : 'border-[var(--border)] hover:border-[var(--border-bright)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                      {project.name}
                    </div>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded-full">
                        <Check size={10} /> Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                        {project.status || 'ACTIVE'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 min-h-8">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="pt-4 mt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                      {project.slug}
                    </span>
                    <Link
                      href="/repositories"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveProjectId(project.id);
                      }}
                      className="inline-flex items-center gap-1 text-[var(--accent)] font-medium hover:underline text-xs"
                    >
                      <span>Repositories</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Create Project Modal ── */}
        <CreateProjectModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onProjectCreated={() => {
            setCreateModalOpen(false);
            loadProjectsData();
          }}
        />
      </div>
    </DeveloperShellWrapper>
  );
}
