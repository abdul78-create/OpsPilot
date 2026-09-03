'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { createProject, setActiveProjectId, Project } from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated?: (project: Project) => void;
}

export function CreateProjectModal({ open, onClose, onProjectCreated }: CreateProjectModalProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name field on open & reset state
  useEffect(() => {
    if (open) {
      setName('');
      setSlug('');
      setIsSlugManuallyEdited(false);
      setDescription('');
      setErrorMessage(null);
      setLoading(false);

      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle ESC key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (errorMessage) setErrorMessage(null);

    // Auto-generate slug unless manually touched
    if (!isSlugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setSlug(slugify(e.target.value));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanSlug = slug.trim() || slugify(cleanName);

    if (!cleanName || cleanName.length < 2) {
      setErrorMessage('Project name must be at least 2 characters.');
      return;
    }

    if (!cleanSlug) {
      setErrorMessage('Please provide a valid project slug.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await createProject(
        cleanName,
        cleanSlug,
        undefined,
        description.trim() || undefined
      );

      if (res.data) {
        setActiveProjectId(res.data.id);
        toast({
          kind: 'success',
          title: 'Project created',
          message: `Workload "${res.data.name}" provisioned successfully.`,
        });

        if (onProjectCreated) {
          onProjectCreated(res.data);
        }

        onClose();
        // Route to the projects / repository connection flow
        router.push('/repositories');
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Unable to create project';
      if (rawMsg.toLowerCase().includes('slug') || rawMsg.toLowerCase().includes('already exists') || rawMsg.toLowerCase().includes('unique')) {
        setErrorMessage('This project slug is already in use. Please choose another.');
      } else if (rawMsg.toLowerCase().includes('network') || rawMsg.toLowerCase().includes('failed to fetch')) {
        setErrorMessage("Couldn't reach OpsPilot. Check your connection and try again.");
      } else {
        setErrorMessage(rawMsg || 'The server could not create this project. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isValid = name.trim().length >= 2 && (slug.trim().length > 0 || name.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      onClick={() => !loading && onClose()}
    >
      <div
        className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-150 border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              Create project
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Give your workload a home in OpsPilot.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Error Banner ── */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[var(--error-dim)] text-[var(--error)] text-xs font-medium leading-relaxed animate-fade-in">
            {errorMessage}
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              Project name <span className="text-[var(--error)]">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              required
              disabled={loading}
              placeholder="e.g. Payments API"
              value={name}
              onChange={handleNameChange}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all"
            />
          </div>

          {/* Project Slug */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              Project slug
            </label>
            <input
              type="text"
              required
              disabled={loading}
              placeholder="payments-api"
              value={slug}
              onChange={handleSlugChange}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] font-mono focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all"
            />
            <p className="text-[11px] text-[var(--text-muted)]">
              Used in project URLs and CLI commands.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              Description <span className="text-[var(--text-muted)] font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              disabled={loading}
              placeholder="What are you building?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all resize-none"
            />
          </div>

          {/* ── Workflow Hint ── */}
          <div className="pt-2 pb-1 text-xs text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text-primary)]">Next steps: </span>
            <span>Connect repository</span>
            <span className="mx-1 text-[var(--text-muted)] opacity-60">→</span>
            <span>Create pipeline</span>
            <span className="mx-1 text-[var(--text-muted)] opacity-60">→</span>
            <span>Run</span>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isValid}
              className="inline-flex items-center gap-1.5 bg-[var(--accent)] text-[var(--accent-fg)] font-semibold text-xs px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Creating project...</span>
                </>
              ) : (
                <span>Create project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
