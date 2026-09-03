'use client';

import React, { useState, useEffect } from 'react';
import { User, CheckCircle2, AlertCircle, Copy, Check, Save } from 'lucide-react';
import { UserProfile, updateUserProfile } from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';

interface AccountSettingsProps {
  user: UserProfile | null;
  onUserUpdated: (user: UserProfile) => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  user,
  onUserUpdated,
}) => {
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-8 text-center text-xs text-[var(--text-muted)]">
        Loading authenticated account profile...
      </div>
    );
  }

  const isDirty = name.trim() !== user.name;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await updateUserProfile(user.id, { name: name.trim() });
      if (res.data) {
        onUserUpdated(res.data);
        toast({
          kind: 'success',
          title: 'Profile Updated',
          message: 'Your display name was successfully saved to OpsPilot.',
        });
      }
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Update Failed',
        message: (err as Error).message || 'Failed to update account profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Account Profile</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Manage your personal identity, display name, and system credentials.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-6">
        {/* Row 1: Display Name */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <label className="text-xs font-semibold text-[var(--text-primary)]">Display Name</label>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              The name visible to your team members across builds, reviews, and logs.
            </p>
          </div>
          <div className="sm:w-72">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              placeholder="e.g. Platform Lead"
              required
            />
          </div>
        </div>

        {/* Row 2: Email Address */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">Email Address</div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Primary email used for authentication and security dispatch.
            </p>
          </div>
          <div className="flex items-center gap-3 sm:w-72 justify-between">
            <span className="text-xs font-mono text-[var(--text-primary)] truncate">{user.email}</span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </span>
          </div>
        </div>

        {/* Row 3: Role & Access Tier */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">System Role</div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Your platform access level governing resource administration.
            </p>
          </div>
          <div className="sm:w-72">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-indigo-500 uppercase tracking-wider text-[10px]">
              {user.role}
            </span>
          </div>
        </div>

        {/* Row 4: Account Identifier */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">User UUID</div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Immutable cryptographic identifier for this account entity.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:w-72 justify-between">
            <span className="text-xs font-mono text-[var(--text-muted)] truncate">{user.id}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="p-1.5 rounded-md hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              title="Copy User ID"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Save Bar */}
        {isDirty && (
          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">Unsaved changes detected.</span>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
