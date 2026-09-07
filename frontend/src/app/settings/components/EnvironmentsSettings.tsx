'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Server, Plus, Edit2, CheckCircle, AlertTriangle, XCircle,
  FolderKanban, Shield, RefreshCw, X, Layers, Zap, Box,
  Globe, Cloud, HardDrive, Wifi, WifiOff, Clock, ChevronRight, Info, Key,
} from 'lucide-react';
import {
  listProjects, listEnvironments, updateEnvironment, createEnvironment,
  testEnvironmentConnection, getActiveProjectId, setActiveProjectId,
  Project, EnvironmentResponse, EnvironmentConnectionStatus,
} from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';

const ENV_TYPES = [
  { value: 'DEVELOPMENT', label: 'Development' },
  { value: 'STAGING', label: 'Staging' },
  { value: 'PRODUCTION', label: 'Production' },
];

interface TargetTypeDef {
  value: string; label: string; description: string;
  supportLabel: string; supportVariant: 'supported' | 'credentials-required' | 'coming-soon';
  Icon: React.ElementType;
}

const TARGET_TYPES: TargetTypeDef[] = [
  { value: 'DOCKER', label: 'Docker', description: 'Runtime containers managed by OpsPilot', supportLabel: 'Supported', supportVariant: 'supported', Icon: Box },
  { value: 'KUBERNETES', label: 'Kubernetes', description: 'Deploy to your own Kubernetes cluster', supportLabel: 'Credentials required', supportVariant: 'credentials-required', Icon: Layers },
  { value: 'SERVERLESS', label: 'Serverless', description: 'Cloud Run / Lambda / Functions', supportLabel: 'Integration required', supportVariant: 'coming-soon', Icon: Zap },
  { value: 'VIRTUAL_MACHINE', label: 'Virtual Machine', description: 'SSH / agent-based VM deployment', supportLabel: 'Integration required', supportVariant: 'coming-soon', Icon: HardDrive },
  { value: 'STATIC', label: 'Static Hosting', description: 'S3 / CDN / CloudFront', supportLabel: 'Integration required', supportVariant: 'coming-soon', Icon: Globe },
];

const UNSUPPORTED_TYPES = new Set(['SERVERLESS', 'VIRTUAL_MACHINE', 'STATIC']);

function ConnectionStatusPill({ status, size = 'md' }: { status: EnvironmentConnectionStatus; size?: 'sm' | 'md' }) {
  const base = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1';
  const sz = size === 'sm' ? 9 : 11;
  switch (status) {
    case 'CONNECTED':
      return <span className={`inline-flex items-center gap-1 font-semibold rounded-full ${base} bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}><Wifi size={sz} />Connected</span>;
    case 'CONFIGURED':
      return <span className={`inline-flex items-center gap-1 font-semibold rounded-full ${base} bg-blue-500/10 text-blue-400 border border-blue-500/20`}><CheckCircle size={sz} />Configured</span>;
    case 'CONNECTION_TESTING':
      return <span className={`inline-flex items-center gap-1 font-semibold rounded-full ${base} bg-purple-500/10 text-purple-400 border border-purple-500/20`}><RefreshCw size={sz} className="animate-spin" />Testing...</span>;
    case 'CONNECTION_FAILED':
      return <span className={`inline-flex items-center gap-1 font-semibold rounded-full ${base} bg-red-500/10 text-red-400 border border-red-500/20`}><XCircle size={sz} />Connection failed</span>;
    case 'UNSUPPORTED':
      return <span className={`inline-flex items-center gap-1 font-semibold rounded-full ${base} bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)]`}><WifiOff size={sz} />Unsupported</span>;
    default:
      return <span className={`inline-flex items-center gap-1 font-semibold rounded-full ${base} bg-amber-500/10 text-amber-400 border border-amber-500/20`}><AlertTriangle size={sz} />Not configured</span>;
  }
}

export function EnvironmentsSettings() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingEnvironments, setLoadingEnvironments] = useState(false);
  const [modalStep, setModalStep] = useState<'choose-type' | 'configure'>('choose-type');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<EnvironmentResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formType, setFormType] = useState('STAGING');
  const [formTargetType, setFormTargetType] = useState('');
  const [formClusterName, setFormClusterName] = useState('');
  const [formClusterRegion, setFormClusterRegion] = useState('');
  const [formNamespace, setFormNamespace] = useState('');
  const [formRequiresApproval, setFormRequiresApproval] = useState(false);
  const [formMinApprovers, setFormMinApprovers] = useState(1);
  const [formAutoRollback, setFormAutoRollback] = useState(true);
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null);

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
    } catch { toast({ kind: 'error', title: 'Failed to load projects' }); }
    finally { setLoadingProjects(false); }
  }, [toast]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const loadEnvs = useCallback(async (pid: string) => {
    if (!pid) { setEnvironments([]); return; }
    setLoadingEnvironments(true);
    try {
      const res = await listEnvironments(pid);
      setEnvironments(res.data || []);
    } catch { toast({ kind: 'error', title: 'Failed to load environments' }); }
    finally { setLoadingEnvironments(false); }
  }, [toast]);

  useEffect(() => { if (selectedProjectId) loadEnvs(selectedProjectId); }, [selectedProjectId, loadEnvs]);

  const openConnectModal = () => {
    setEditingEnv(null); setFormName(''); setFormSlug(''); setFormType('STAGING');
    setFormTargetType(''); setFormClusterName(''); setFormClusterRegion('');
    setFormNamespace(''); setFormRequiresApproval(false); setFormMinApprovers(1);
    setFormAutoRollback(true); setModalStep('choose-type'); setModalOpen(true);
  };

  const openEditModal = (env: EnvironmentResponse) => {
    setEditingEnv(env); setFormName(env.name); setFormSlug(env.slug);
    setFormType(env.type || 'STAGING'); setFormTargetType(env.deploymentTargetType || '');
    setFormClusterName(env.clusterName || ''); setFormClusterRegion(env.clusterRegion || '');
    setFormNamespace(env.k8sNamespace || ''); setFormRequiresApproval(env.requiresApproval);
    setFormMinApprovers(env.minApprovers || 1); setFormAutoRollback(true);
    setModalStep(env.deploymentTargetType ? 'configure' : 'choose-type'); setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    if (!formName.trim()) { toast({ kind: 'error', title: 'Name required' }); return; }
    if (!formTargetType) { toast({ kind: 'error', title: 'Select a target type' }); return; }
    if (UNSUPPORTED_TYPES.has(formTargetType)) { toast({ kind: 'error', title: 'Target not yet supported', message: 'Please select Docker or Kubernetes.' }); return; }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(), slug: formSlug.trim() || undefined, type: formType,
        deploymentTargetType: formTargetType || null,
        clusterName: formTargetType === 'KUBERNETES' ? (formClusterName.trim() || null) : null,
        clusterRegion: formTargetType === 'KUBERNETES' ? (formClusterRegion.trim() || null) : null,
        k8sNamespace: formTargetType === 'KUBERNETES' ? (formNamespace.trim() || null) : null,
        requiresApproval: formRequiresApproval, minApprovers: Number(formMinApprovers) || 1,
        autoRollbackEnabled: formAutoRollback,
      };
      if (editingEnv) {
        await updateEnvironment(selectedProjectId, editingEnv.id, payload);
        toast({ kind: 'success', title: 'Target configured', message: `Saved for '${formName}'.` });
      } else {
        await createEnvironment(selectedProjectId, payload);
        toast({ kind: 'success', title: 'Environment created', message: `'${formName}' provisioned.` });
      }
      setModalOpen(false); loadEnvs(selectedProjectId);
    } catch (err: unknown) {
      toast({ kind: 'error', title: 'Save failed', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally { setSaving(false); }
  };

  const handleTestConnection = async (env: EnvironmentResponse) => {
    if (!selectedProjectId) return;
    setTestingConnectionId(env.id);
    setEnvironments((prev) => prev.map((e) => e.id === env.id ? { ...e, connectionStatus: 'CONNECTION_TESTING' as EnvironmentConnectionStatus } : e));
    try {
      const res = await testEnvironmentConnection(selectedProjectId, env.id);
      const { connectionStatus, testedAt } = res.data;
      setEnvironments((prev) => prev.map((e) => e.id === env.id ? { ...e, connectionStatus, lastConnectionTestedAt: testedAt, lastConnectionError: null } : e));
      if (connectionStatus === 'CONNECTED') toast({ kind: 'success', title: 'Connection successful', message: res.message });
      else if (connectionStatus === 'UNSUPPORTED') toast({ kind: 'info', title: 'Not supported yet', message: res.message });
      else toast({ kind: 'error', title: 'Connection result', message: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection test failed';
      setEnvironments((prev) => prev.map((e) => e.id === env.id ? { ...e, connectionStatus: 'CONNECTION_FAILED' as EnvironmentConnectionStatus, lastConnectionError: msg } : e));
      toast({ kind: 'error', title: 'Test failed', message: msg });
    } finally { setTestingConnectionId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-500" />
            Environments &amp; Deployment Targets
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Connect your deployment infrastructure. Credentials are stored encrypted and never returned to the browser.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <select value={selectedProjectId} onChange={(e) => { setSelectedProjectId(e.target.value); setActiveProjectId(e.target.value); }}
              disabled={loadingProjects || projects.length === 0}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500">
              {projects.map((p) => <option key={p.id} value={p.id}>Project: {p.name}</option>)}
            </select>
          </div>
          <button id="add-environment-btn" onClick={openConnectModal} disabled={!selectedProjectId}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg transition-colors shadow-xs disabled:opacity-50">
            <Plus size={14} /><span>Add Environment</span>
          </button>
        </div>
      </div>

      {loadingEnvironments ? (
        <div className="p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /><span>Loading environments...</span>
        </div>
      ) : environments.length === 0 ? (
        <div className="p-10 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto"><Layers className="w-6 h-6" /></div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">No environments configured</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">Add an environment and connect your deployment infrastructure to start running pipelines.</p>
          </div>
          <button onClick={openConnectModal} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">
            <Plus size={13} /><span>Configure your first environment</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {environments.map((env) => {
            const isConfigured = !!env.deploymentTargetType;
            const isTesting = testingConnectionId === env.id;
            const status: EnvironmentConnectionStatus = isTesting ? 'CONNECTION_TESTING' : (env.connectionStatus ?? 'NOT_CONFIGURED');
            const targetDef = TARGET_TYPES.find((d) => d.value === env.deploymentTargetType);
            return (
              <div key={env.id} className="p-5 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-bright)] transition-colors shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--text-primary)]">{env.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${env.type === 'PRODUCTION' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : env.type === 'STAGING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>{env.type}</span>
                    </div>
                    <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">slug: {env.slug}</p>
                  </div>
                  <button id={`edit-env-${env.id}`} onClick={() => openEditModal(env)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors" title="Edit configuration">
                    <Edit2 size={14} />
                  </button>
                </div>

                {!isConfigured ? (
                  <div className="p-4 rounded-lg bg-[var(--surface-secondary)]/60 border border-dashed border-[var(--border-subtle)] text-center space-y-2">
                    <p className="text-[11px] font-semibold text-[var(--text-muted)]">Deployment target not configured</p>
                    <p className="text-[10px] text-[var(--text-muted)] max-w-[220px] mx-auto">No deployment infrastructure has been connected to this environment.</p>
                    <button id={`connect-target-${env.id}`} onClick={() => openEditModal(env)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 mt-1">
                      <Plus size={11} />Connect Deployment Target
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-muted)]">Target Type:</span>
                      <span className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                        {targetDef && <targetDef.Icon size={13} className="text-indigo-400" />}
                        {targetDef?.label ?? env.deploymentTargetType}
                      </span>
                    </div>
                    {env.clusterName && <div className="flex items-center justify-between text-[11px]"><span className="text-[var(--text-muted)]">Cluster:</span><span className="font-mono font-medium text-[var(--text-primary)] truncate max-w-[180px]">{env.clusterName}</span></div>}
                    {env.clusterRegion && <div className="flex items-center justify-between text-[11px]"><span className="text-[var(--text-muted)]">Region:</span><span className="font-mono text-[var(--text-secondary)]">{env.clusterRegion}</span></div>}
                    {env.k8sNamespace && <div className="flex items-center justify-between text-[11px]"><span className="text-[var(--text-muted)]">Namespace:</span><span className="font-mono font-medium text-[var(--text-primary)]">{env.k8sNamespace}</span></div>}
                    {env.deploymentTargetType === 'KUBERNETES' && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--text-muted)]">Credentials:</span>
                        {env.credentialsConfigured
                          ? <span className="inline-flex items-center gap-1 text-emerald-400 font-medium"><Key size={10} />Stored securely</span>
                          : <span className="inline-flex items-center gap-1 text-amber-400 font-medium"><Key size={10} />Not configured</span>}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ConnectionStatusPill status={status} size="sm" />
                      {env.lastConnectionTestedAt && (
                        <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          <Clock size={9} />{new Date(env.lastConnectionTestedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    {env.requiresApproval && <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 font-medium"><Shield size={10} />{env.minApprovers} sign-off</span>}
                  </div>
                  {env.lastConnectionError && status !== 'CONNECTION_TESTING' && (
                    <p className="text-[10px] text-red-400/80 bg-red-500/5 border border-red-500/10 rounded px-2 py-1.5 leading-relaxed">{env.lastConnectionError}</p>
                  )}
                  {isConfigured && (
                    <button id={`test-connection-${env.id}`} onClick={() => handleTestConnection(env)} disabled={isTesting}
                      className="w-full text-[11px] font-semibold py-1.5 px-3 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-indigo-400 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                      {isTesting ? <><RefreshCw size={11} className="animate-spin" />Testing connection...</> : <><Wifi size={11} />Test Connection</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-500" />
                  {editingEnv ? `Configure: ${editingEnv.name}` : 'Connect Deployment Target'}
                </h3>
                {modalStep === 'choose-type' && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Choose where this environment deploys</p>}
              </div>
              <button onClick={() => setModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md"><X size={16} /></button>
            </div>

            {modalStep === 'choose-type' && (
              <div className="space-y-3">
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">Select the type of infrastructure where your application will be deployed.</p>
                <div className="grid grid-cols-1 gap-2">
                  {TARGET_TYPES.map((def) => {
                    const isCS = def.supportVariant === 'coming-soon';
                    return (
                      <button key={def.value} id={`target-type-${def.value.toLowerCase()}`} type="button" disabled={isCS}
                        onClick={() => { setFormTargetType(def.value); setModalStep('configure'); }}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${isCS ? 'border-[var(--border-subtle)] opacity-50 cursor-not-allowed' : 'border-[var(--border-subtle)] hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer'}`}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isCS ? 'bg-[var(--surface-secondary)]' : 'bg-indigo-500/10'}`}>
                          <def.Icon size={18} className={isCS ? 'text-[var(--text-muted)]' : 'text-indigo-400'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">{def.label}</span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${def.supportVariant === 'supported' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : def.supportVariant === 'credentials-required' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)]'}`}>{def.supportLabel}</span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{def.description}</p>
                        </div>
                        {!isCS && <ChevronRight size={14} className="text-[var(--text-muted)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {modalStep === 'configure' && (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <button type="button" onClick={() => setModalStep('choose-type')} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1">
                  &#8592; Change target type
                </button>
                {formTargetType && (() => {
                  const def = TARGET_TYPES.find((d) => d.value === formTargetType);
                  if (!def) return null;
                  return (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                      <def.Icon size={14} className="text-indigo-400" />
                      <span className="text-[11px] font-semibold text-[var(--text-primary)]">{def.label}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ml-auto ${def.supportVariant === 'supported' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : def.supportVariant === 'credentials-required' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)]'}`}>{def.supportLabel}</span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--text-secondary)]">Name <span className="text-red-400">*</span></label>
                    <input type="text" required placeholder="e.g. Staging East" value={formName} onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--text-secondary)]">Environment Type</label>
                    <select value={formType} onChange={(e) => setFormType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      {ENV_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                {formTargetType === 'DOCKER' && (
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-[11px]"><Info size={12} />OpsPilot-managed Docker</div>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">Docker deployments run on OpsPilot&apos;s internal runtime. No external Docker host configuration is required. Customer-managed Docker hosts are not yet supported.</p>
                  </div>
                )}

                {formTargetType === 'KUBERNETES' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-secondary)]">Cluster Name</label>
                      <input type="text" placeholder="Your Kubernetes cluster name (from your cloud provider)" value={formClusterName} onChange={(e) => setFormClusterName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]" />
                      <p className="text-[10px] text-[var(--text-muted)]">Found in your cloud provider Kubernetes dashboard (GKE, EKS, AKS, etc.)</p>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-secondary)]">Cloud Region</label>
                      <input type="text" placeholder="The region where your cluster is provisioned" value={formClusterRegion} onChange={(e) => setFormClusterRegion(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--text-secondary)]">Kubernetes Namespace</label>
                      <input type="text" placeholder="The namespace where workloads will be deployed" value={formNamespace} onChange={(e) => setFormNamespace(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]" />
                      <p className="text-[10px] text-[var(--text-muted)]">A namespace groups your workloads and isolates them from other applications in the cluster.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]"><Key size={12} />Cluster Credentials</div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">Kubernetes credentials are stored encrypted in the OpsPilot Secrets vault and never returned to the browser. Configure credentials through the Secrets section after saving this environment.</p>
                      <p className="text-[10px] text-amber-400/80 mt-1">Deployment is blocked until credentials are added via Secrets.</p>
                    </div>
                  </div>
                )}

                {UNSUPPORTED_TYPES.has(formTargetType) && (
                  <div className="p-4 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-center space-y-1">
                    <Cloud size={20} className="text-[var(--text-muted)] mx-auto" />
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Integration not yet available</p>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">This target type is not yet supported. Please select Docker or Kubernetes.</p>
                  </div>
                )}

                {!UNSUPPORTED_TYPES.has(formTargetType) && (
                  <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" id="requires-approval-checkbox" checked={formRequiresApproval} onChange={(e) => setFormRequiresApproval(e.target.checked)}
                        className="rounded border-[var(--border-subtle)] text-indigo-600 focus:ring-indigo-500" />
                      <span className="font-semibold text-[var(--text-primary)]">Require manual approval gate</span>
                    </label>
                    {formRequiresApproval && (
                      <div className="pl-6 space-y-1">
                        <label className="text-[10px] text-[var(--text-muted)]">Minimum approvers:</label>
                        <input type="number" min={1} max={10} value={formMinApprovers} onChange={(e) => setFormMinApprovers(Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-xs font-mono" />
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors">Cancel</button>
                  <button type="submit" disabled={saving || UNSUPPORTED_TYPES.has(formTargetType)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs disabled:opacity-50">
                    {saving ? 'Saving...' : editingEnv ? 'Save Changes' : 'Create Environment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
