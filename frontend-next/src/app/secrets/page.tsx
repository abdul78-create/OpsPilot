'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  KeyRound, Plus, Trash2, RefreshCw, Eye, EyeOff,
  CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import { listSecrets, createSecret, deleteSecret, Secret } from '@/lib/apiClient';
import { SkeletonTableRows, EmptyState, SearchInput, ConfirmDialog } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';

function timeAgo(d?: string) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export default function SecretsPage() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Secret | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listSecrets();
      setSecrets(res.data ?? []);
    } catch {
      toast({ kind: 'error', title: 'Failed to load secrets' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey || !formValue) return;
    setSaving(true);
    try {
      await createSecret(formKey, formValue, formDesc || undefined);
      toast({ kind: 'success', title: 'Secret created', message: formKey });
      setFormKey(''); setFormValue(''); setFormDesc(''); setShowForm(false);
      load();
    } catch {
      toast({ kind: 'error', title: 'Failed to create secret', message: 'Check key format (no spaces, use underscores)' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    setDeleteTarget(null);
    try {
      await deleteSecret(deleteTarget.id);
      toast({ kind: 'success', title: 'Secret deleted', message: deleteTarget.key });
      load();
    } catch {
      toast({ kind: 'error', title: 'Failed to delete secret' });
    } finally {
      setDeleting(null);
    }
  };

  const filtered = secrets.filter(s =>
    !search || (s.key + (s.description ?? '')).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">

        {/* Header */}
        <div className="h-14 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <KeyRound size={15} className="text-[var(--text-muted)]" />
            <h1 className="text-sm font-bold text-[var(--text-primary)]">Secrets</h1>
            <span className="text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-full">{secrets.length} secrets</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 text-[11px] bg-[var(--accent)] text-[var(--accent-fg)] px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80"
            >
              <Plus size={12} /> New Secret
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[var(--warning-dim)] border border-[var(--warning)] rounded-xl text-xs text-[var(--warning)] shrink-0">
          <AlertCircle size={13} className="shrink-0" />
          Secrets are encrypted at rest and never exposed in plain text. Values are write-only — you cannot read them back.
        </div>

        {/* Create Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 space-y-3 shrink-0">
            <p className="text-xs font-bold text-[var(--text-primary)]">Create New Secret</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block mb-1">Key *</label>
                <input
                  type="text"
                  value={formKey}
                  onChange={e => setFormKey(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                  placeholder="MY_SECRET_KEY"
                  required
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-bright)]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block mb-1">Description</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Optional description"
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-bright)]"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block mb-1">Value *</label>
              <div className="relative">
                <input
                  type={showValue ? 'text' : 'password'}
                  value={formValue}
                  onChange={e => setFormValue(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-3 py-2 pr-10 text-xs text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-bright)]"
                />
                <button
                  type="button"
                  onClick={() => setShowValue(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  {showValue ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Save Secret
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="shrink-0 max-w-sm">
          <SearchInput value={search} onChange={setSearch} placeholder="Search secrets by key..." />
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col">
          <div className="h-9 px-4 border-b border-[var(--border)] flex items-center gap-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider shrink-0 bg-[var(--bg-tertiary)]">
            <span className="flex-1">Key</span>
            <span className="flex-1">Description</span>
            <span className="w-24 text-right">Updated</span>
            <span className="w-16 text-right">Actions</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <SkeletonTableRows rows={5} cols={4} />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<KeyRound size={32} />}
                title="No secrets configured"
                description="Secure environment variables will be injected into build processes"
              />
            ) : (
              filtered.map(s => (
                <div key={s.id} className="h-14 px-4 border-b border-[var(--border)] flex items-center gap-4 text-xs hover:bg-[var(--bg-tertiary)] transition-colors">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-mono font-semibold text-[var(--text-primary)] truncate">{s.key}</span>
                  </div>
                  <div className="flex-1 text-[var(--text-muted)] truncate">
                    {s.description || <span className="italic opacity-50">No description</span>}
                  </div>
                  <div className="w-24 text-right font-mono text-[10px] text-[var(--text-muted)]">
                    {timeAgo(s.createdAt)}
                  </div>
                  <div className="w-16 flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      disabled={deleting === s.id}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error-dim)] transition-colors"
                    >
                      {deleting === s.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Secret"
          message={`Are you sure you want to permanently delete secret variable "${deleteTarget?.key}"? This action cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </DeveloperShell>
  );
}
