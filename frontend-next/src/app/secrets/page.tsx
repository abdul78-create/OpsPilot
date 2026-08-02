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
        <div className="h-14 px-4 rounded-xl bg-[#111113] border border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <KeyRound size={16} className="text-violet-400" />
            <h1 className="text-sm font-bold text-zinc-100">Secrets</h1>
            <span className="text-[10px] font-mono text-zinc-500 border border-[#27272A] px-2 py-0.5 rounded-full">{secrets.length} secrets</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 text-[11px] bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              <Plus size={12} /> New Secret
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-900/10 border border-amber-800/30 rounded-xl text-xs text-amber-300 shrink-0 animate-fade-in">
          <AlertCircle size={14} className="shrink-0" />
          Secrets are encrypted at rest and never exposed in plain text. Values are write-only — you cannot read them back.
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-[#111113] border border-[#27272A] rounded-xl p-4 space-y-3 shrink-0 animate-slide-up">
            <p className="text-xs font-bold text-zinc-200">Create New Secret</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Key *</label>
                <input
                  type="text"
                  value={formKey}
                  onChange={e => setFormKey(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                  placeholder="MY_SECRET_KEY"
                  required
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono placeholder-zinc-650 focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Description</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Optional description"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-violet-500/50"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Value *</label>
              <div className="relative">
                <input
                  type={showValue ? 'text' : 'password'}
                  value={formValue}
                  onChange={e => setFormValue(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 pr-10 text-xs text-zinc-200 font-mono placeholder-zinc-650 focus:outline-none focus:border-violet-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowValue(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showValue ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-[#27272A] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-50"
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
        <div className="flex-1 min-h-0 bg-[#111113] border border-[#27272A] rounded-xl overflow-hidden flex flex-col">
          <div className="h-9 px-4 border-b border-[#27272A] flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 bg-[#18181B]/40">
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
                <div key={s.id} className="h-14 px-4 border-b border-[#27272A]/60 flex items-center gap-4 text-xs hover:bg-[#18181B]/20 transition-colors">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-mono font-semibold text-zinc-200 truncate">{s.key}</span>
                  </div>
                  <div className="flex-1 text-zinc-400 truncate">
                    {s.description || <span className="text-zinc-650 italic">No description</span>}
                  </div>
                  <div className="w-24 text-right font-mono text-[10px] text-zinc-500">
                    {timeAgo(s.createdAt)}
                  </div>
                  <div className="w-16 flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      disabled={deleting === s.id}
                      className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
