'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Copy, Check, Save, AlertTriangle, Trash2 } from 'lucide-react';
import { Organization, updateOrganization, deleteOrganization } from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';

interface OrganizationSettingsProps {
  organization: Organization | null;
  onOrganizationUpdated: (org: Organization) => void;
}

export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
  organization,
  onOrganizationUpdated,
}) => {
  const [name, setName] = useState(organization?.name || '');
  const [slug, setSlug] = useState(organization?.slug || '');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Danger Zone deletion modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setSlug(organization.slug);
    }
  }, [organization]);

  if (!organization) {
    return (
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-8 text-center text-xs text-[var(--text-muted)]">
        Loading organization metadata...
      </div>
    );
  }

  const isDirty = name.trim() !== organization.name || slug.trim() !== organization.slug;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setSaving(true);
    try {
      const res = await updateOrganization(organization.id, {
        name: name.trim(),
        slug: slug.trim(),
      });
      if (res.data) {
        onOrganizationUpdated(res.data);
        toast({
          kind: 'success',
          title: 'Organization Updated',
          message: 'Organization settings successfully persisted.',
        });
      }
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Update Failed',
        message: (err as Error).message || 'Failed to update organization.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== organization.name) return;
    setDeleting(true);
    try {
      await deleteOrganization(organization.id);
      toast({
        kind: 'success',
        title: 'Organization Deleted',
        message: `Organization '${organization.name}' was successfully deleted.`,
      });
      window.location.href = '/login';
    } catch (err) {
      toast({
        kind: 'error',
        title: 'Deletion Failed',
        message: (err as Error).message || 'Failed to delete organization.',
      });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(organization.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Organization Settings</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Configure the primary organizational boundary, URL namespace slug, and tenant metadata.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-6">
        {/* Organization Name */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <label className="text-xs font-semibold text-[var(--text-primary)]">Organization Name</label>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              The human-readable title shown in invoices, headers, and team views.
            </p>
          </div>
          <div className="sm:w-72">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              required
            />
          </div>
        </div>

        {/* Organization Slug */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <label className="text-xs font-semibold text-[var(--text-primary)]">Namespace Slug</label>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Unique URL identifier used for routing and repository webhooks.
            </p>
          </div>
          <div className="sm:w-72">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]"
              required
            />
          </div>
        </div>

        {/* Organization UUID */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">Organization ID</div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Tenant identifier required for API integration and OpenTelemetry tracing.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:w-72 justify-between">
            <span className="text-xs font-mono text-[var(--text-muted)] truncate">{organization.id}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="p-1.5 rounded-md hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              title="Copy Organization ID"
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

      {/* ── Danger Zone ── */}
      <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Deleting this organization permanently destroys all associated projects, pipelines, runs, artifacts, and secrets.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors shrink-0"
          >
            Delete Organization
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--surface-primary)] border border-rose-500/30 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-slide-up text-xs">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5" />
              Confirm Organization Deletion
            </div>

            <p className="text-[var(--text-secondary)] leading-relaxed">
              This action is permanent and cannot be undone. All pipeline executions, deployed containers, and encryption keys will be immediately revoked.
            </p>

            <div className="space-y-1.5">
              <label className="text-[var(--text-primary)] font-medium">
                Type <span className="font-bold text-[var(--text-primary)]">{organization.name}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={organization.name}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText !== organization.name}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 shadow-sm"
              >
                {deleting ? 'Deleting...' : 'Delete Organization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
