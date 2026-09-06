'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Plus,
  Edit2,
  CheckCircle,
  AlertTriangle,
  FolderKanban,
  Shield,
  RefreshCw,
  X,
  Layers,
} from 'lucide-react';
import {
  listProjects,
  listEnvironments,
  updateEnvironment,
  createEnvironment,
  deleteEnvironment,
  getActiveProjectId,
  setActiveProjectId,
  Project,
  EnvironmentResponse,
} from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';

const TARGET_TYPES = [
  { value: 'KUBERNETES', label: 'Kubernetes (K8s)' },
  { value: 'DOCKER', label: 'Docker Engine / Compose' },
  { value: 'SERVERLESS', label: 'Serverless (Cloud Run / Lambda)' },
  { value: 'VIRTUAL_MACHINE', label: 'Virtual Machine / EC2' },
  { value: 'STATIC', label: 'Static Hosting / S3' },
];

const ENV_TYPES = [
  { value: 'DEVELOPMENT', label: 'Development' },
  { value: 'STAGING', label: 'Staging' },
  { value: 'PRODUCTION', label: 'Production' },
];

export function EnvironmentsSettings() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingEnvironments, setLoadingEnvironments] = useState(false);

  // Edit / Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<EnvironmentResponse | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formType, setFormType] = useState('STAGING');
  const [formTargetType, setFormTargetType] = useState('KUBERNETES');
  const [formClusterName, setFormClusterName] = useState('');
  const [formClusterRegion, setFormClusterRegion] = useState('');
  const [formNamespace, setFormNamespace] = useState('');
  const [formRequiresApproval, setFormRequiresApproval] = useState(false);
  const [formMinApprovers, setFormMinApprovers] = useState(1);
  const [formAutoRollback, setFormAutoRollback] = useState(true);

  // Load Projects on Mount
  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await listProjects();
      const projs = res.data || [];
      setProjects(projs);
      const activeId = getActiveProjectId();
      if (activeId && projs.some((p) => p.id === activeId)) {
        setSelectedProjectId(activeId);
      } else if (projs.length > 0) {
        setSelectedProjectId(projs[0].id);
        setActiveProjectId(projs[0].id);
      }
    } catch {
      toast({ kind: 'error', title: 'Failed to load projects' });
    } finally {
      setLoadingProjects(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Load Environments for Selected Project
  const loadEnvs = useCallback(async (pid: string) => {
    if (!pid) {
      setEnvironments([]);
      return;
    }
    setLoadingEnvironments(true);
    try {
      const res = await listEnvironments(pid);
      setEnvironments(res.data || []);
    } catch {
      toast({ kind: 'error', title: 'Failed to load environments for project' });
    } finally {
      setLoadingEnvironments(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedProjectId) {
      loadEnvs(selectedProjectId);
    }
  }, [selectedProjectId, loadEnvs]);

  const openCreateModal = () => {
    setEditingEnv(null);
    setFormName('');
    setFormSlug('');
    setFormType('STAGING');
    setFormTargetType('KUBERNETES');
    setFormClusterName('');
    setFormClusterRegion('');
    setFormNamespace('');
    setFormRequiresApproval(false);
    setFormMinApprovers(1);
    setFormAutoRollback(true);
    setModalOpen(true);
  };

  const openEditModal = (env: EnvironmentResponse) => {
    setEditingEnv(env);
    setFormName(env.name);
    setFormSlug(env.slug);
    setFormType(env.type || 'STAGING');
    setFormTargetType(env.deploymentTargetType || 'KUBERNETES');
    setFormClusterName(env.clusterName || '');
    setFormClusterRegion(env.clusterRegion || '');
    setFormNamespace(env.k8sNamespace || '');
    setFormRequiresApproval(env.requiresApproval);
    setFormMinApprovers(env.minApprovers || 1);
    setFormAutoRollback(true);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    if (!formName.trim()) {
      toast({ kind: 'error', title: 'Validation error', message: 'Environment name is required' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        type: formType,
        deploymentTargetType: formTargetType || null,
        clusterName: formClusterName.trim() || null,
        clusterRegion: formClusterRegion.trim() || null,
        k8sNamespace: formNamespace.trim() || null,
        requiresApproval: formRequiresApproval,
        minApprovers: Number(formMinApprovers) || 1,
        autoRollbackEnabled: formAutoRollback,
      };

      if (editingEnv) {
        await updateEnvironment(selectedProjectId, editingEnv.id, payload);
        toast({
          kind: 'success',
          title: 'Environment updated',
          message: `Updated configuration for '${formName}'.`,
        });
      } else {
        await createEnvironment(selectedProjectId, payload);
        toast({
          kind: 'success',
          title: 'Environment created',
          message: `Provisioned new environment '${formName}'.`,
        });
      }

      setModalOpen(false);
      loadEnvs(selectedProjectId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save environment configuration';
      toast({ kind: 'error', title: 'Save failed', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-500" />
            Environments & Deployment Targets
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Configure target Kubernetes clusters, namespaces, and gate approvals for each project environment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Project Switcher */}
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <select
              value={selectedProjectId}
              onChange={(e) => {
                const pid = e.target.value;
                setSelectedProjectId(pid);
                setActiveProjectId(pid);
              }}
              disabled={loadingProjects || projects.length === 0}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Project: {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={openCreateModal}
            disabled={!selectedProjectId}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            <Plus size={14} />
            <span>Add Environment</span>
          </button>
        </div>
      </div>

      {/* Environments List */}
      {loadingEnvironments ? (
        <div className="p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading project environments...</span>
        </div>
      ) : environments.length === 0 ? (
        <div className="p-8 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              No environments configured
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">
              Add a staging or production environment with your cluster and namespace to start generating and running deployment pipelines.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:underline"
          >
            <Plus size={13} />
            <span>Configure your first environment</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {environments.map((env) => {
            const isTargetConfigured = !!(env.clusterName && env.k8sNamespace);
            return (
              <div
                key={env.id}
                className="p-5 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-bright)] transition-colors shadow-xs space-y-4"
              >
                {/* Top Row: Name, Type Badge, Edit */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--text-primary)]">
                        {env.name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          env.type === 'PRODUCTION'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : env.type === 'STAGING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {env.type}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                      slug: {env.slug}
                    </p>
                  </div>

                  <button
                    onClick={() => openEditModal(env)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    title="Edit deployment target configuration"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>

                {/* Deployment Target Details */}
                <div className="p-3 rounded-lg bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Target Type:</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {env.deploymentTargetType || 'Not specified'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Cluster Name:</span>
                    {env.clusterName ? (
                      <span className="font-mono font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                        {env.clusterName}
                      </span>
                    ) : (
                      <span className="text-amber-400 italic">Unconfigured</span>
                    )}
                  </div>

                  {env.clusterRegion && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-muted)]">Region:</span>
                      <span className="font-mono text-[var(--text-secondary)]">
                        {env.clusterRegion}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Namespace:</span>
                    {env.k8sNamespace ? (
                      <span className="font-mono font-medium text-[var(--text-primary)]">
                        {env.k8sNamespace}
                      </span>
                    ) : (
                      <span className="text-amber-400 italic">Unconfigured</span>
                    )}
                  </div>
                </div>

                {/* Status Indicator & Protection Rules */}
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                  {isTargetConfigured ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle size={12} /> Target Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                      <AlertTriangle size={12} /> Target not configured
                    </span>
                  )}

                  {env.requiresApproval && (
                    <span className="inline-flex items-center gap-1 text-indigo-400 font-medium">
                      <Shield size={12} /> Requires {env.minApprovers} sign-off
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-500" />
                {editingEnv ? `Configure ${editingEnv.name}` : 'Create Environment'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Name & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-secondary)]">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Staging East"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-secondary)]">Environment Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {ENV_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Deployment Target Type */}
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-secondary)]">Target Type</label>
                <select
                  value={formTargetType}
                  onChange={(e) => setFormTargetType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {TARGET_TYPES.map((tt) => (
                    <option key={tt.value} value={tt.value}>
                      {tt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cluster Name & Region */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-secondary)]">Cluster Name</label>
                  <input
                    type="text"
                    placeholder="e.g. primary-k8s-cluster"
                    value={formClusterName}
                    onChange={(e) => setFormClusterName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-secondary)]">Cluster Region</label>
                  <input
                    type="text"
                    placeholder="e.g. us-east-1"
                    value={formClusterRegion}
                    onChange={(e) => setFormClusterRegion(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Kubernetes Namespace */}
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-secondary)]">Kubernetes Namespace</label>
                <input
                  type="text"
                  placeholder="e.g. staging-workloads"
                  value={formNamespace}
                  onChange={(e) => setFormNamespace(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]"
                />
              </div>

              {/* Protection & Governance */}
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formRequiresApproval}
                    onChange={(e) => setFormRequiresApproval(e.target.checked)}
                    className="rounded border-[var(--border-subtle)] text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-[var(--text-primary)]">
                    Require manual approval gate
                  </span>
                </label>

                {formRequiresApproval && (
                  <div className="pl-6 space-y-1">
                    <label className="text-[11px] text-[var(--text-muted)]">Minimum approvers:</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={formMinApprovers}
                      onChange={(e) => setFormMinApprovers(Number(e.target.value))}
                      className="w-20 px-2 py-1 rounded bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingEnv ? 'Save Changes' : 'Create Environment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
