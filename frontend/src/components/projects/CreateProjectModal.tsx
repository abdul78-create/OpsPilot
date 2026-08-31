'use client';

import React, { useState } from 'react';
import { FolderPlus, X, Loader2, Sparkles, Building } from 'lucide-react';
import { createProject, setActiveProjectId, Project } from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export function CreateProjectModal({ open, onClose, onProjectCreated }: CreateProjectModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Auto-generate slug from name if user hasn't manually edited slug
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setLoading(true);
    try {
      const res = await createProject(name.trim(), slug.trim(), undefined, description.trim() || undefined);
      if (res.data) {
        setActiveProjectId(res.data.id);
        toast({
          kind: 'success',
          title: 'Project created',
          message: `Project "${res.data.name}" provisioned with default environments`,
        });
        onProjectCreated(res.data);
        onClose();
        setName('');
        setSlug('');
        setDescription('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      toast({ kind: 'error', title: 'Project creation failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
              <FolderPlus size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Create Project</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Organize your repositories, pipelines, and environments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1.5 font-medium">
              Project Name <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Production Storefront"
              value={name}
              onChange={handleNameChange}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-bright)] text-xs"
            />
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1.5 font-medium">
              Project Slug <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. production-storefront"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-bright)] font-mono text-xs"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Used in URL paths and automated CLI routing.
            </p>
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1.5 font-medium">
              Description <span className="text-[var(--text-muted)] font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Brief description of this project's microservices or repository scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-bright)] text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !slug.trim()}
              className="flex items-center gap-1.5 bg-[var(--accent)] text-[var(--accent-fg)] font-semibold px-4 py-2 rounded-xl transition-opacity hover:opacity-85 disabled:opacity-50 text-xs shadow-sm"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <FolderPlus size={13} />}
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
