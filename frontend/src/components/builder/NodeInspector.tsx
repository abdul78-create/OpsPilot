'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Node } from '@xyflow/react';
import { SlidersHorizontal, Trash2, Sparkles, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { resolveDeployEnvironment } from './DAGCompiler';
import { listEnvironments, EnvironmentResponse, getActiveProjectId } from '@/lib/apiClient';

// SSR-safe Monaco — requires browser APIs
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface NodeInspectorProps {
  selectedNode: Node | null;
  onUpdateNodeData: (id: string, data: Record<string, unknown>) => void;
  onDeleteNode: (id: string) => void;
  onClose: () => void;
  projectId?: string;
}

const monacoTheme = 'vs-dark';
const monacoOptions = {
  minimap: { enabled: false },
  fontSize: 12,
  lineNumbers: 'off' as const,
  folding: false,
  scrollBeyondLastLine: false,
  wordWrap: 'on' as const,
  tabSize: 2,
  renderLineHighlight: 'none' as const,
  overviewRulerBorder: false,
  scrollbar: { vertical: 'hidden' as const, horizontal: 'hidden' as const },
  padding: { top: 8, bottom: 8 },
};

function MonacoField({
  label,
  value,
  language,
  onChange,
  height = 80,
}: {
  label: string;
  value: string;
  language: string;
  onChange?: (v: string) => void;
  height?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', height }}>
        <MonacoEditor
          language={language}
          value={value}
          theme={monacoTheme}
          options={monacoOptions}
          onChange={(v) => onChange?.(v ?? '')}
        />
      </div>
    </div>
  );
}

export function NodeInspector({ selectedNode, onUpdateNodeData, onDeleteNode, onClose, projectId }: NodeInspectorProps) {
  const [environments, setEnvironments] = useState<EnvironmentResponse[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadEnvironments() {
      const pid = projectId || getActiveProjectId();
      if (!pid) return;
      try {
        const res = await listEnvironments(pid);
        if (isMounted && res?.data) {
          setEnvironments(res.data);
        }
      } catch {
        /* ignore */
      }
    }
    loadEnvironments();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  if (!selectedNode) {
    return (
      <aside
        className="w-80 border-l flex flex-col items-center justify-center p-6 text-center select-none"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <SlidersHorizontal size={24} className="mb-2 opacity-40" style={{ color: 'var(--text-muted)' }} />
        <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>No Step Selected</h3>
        <p className="text-[11px] mt-1 max-w-xs" style={{ color: 'var(--text-muted)' }}>
          Click any step in the canvas to inspect properties, configure execution commands, and view AI recommendations.
        </p>
      </aside>
    );
  }

  const { id, type, data } = selectedNode;

  return (
    <aside
      className="w-80 border-l flex flex-col h-full overflow-hidden select-none"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div
        className="h-14 px-4 border-b flex items-center justify-between shrink-0"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} style={{ color: 'var(--accent)' }} />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>{String(data.label ?? type)}</h3>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>ID: {id}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Step Status Pill */}
        <div
          className="p-2.5 rounded-xl border flex items-center justify-between text-xs"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>Step Status</span>
          <span
            className="text-[10px] font-mono border px-2 py-0.5 rounded-md flex items-center gap-1"
            style={{
              background: 'var(--success-dim)',
              borderColor: 'var(--success)',
              color: 'var(--success)',
            }}
          >
            <CheckCircle2 size={10} /> Validated
          </span>
        </div>

        {/* AI Tip */}
        <div
          className="p-3 rounded-xl border text-xs space-y-1"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--text-primary)' }}>
            <Sparkles size={13} style={{ color: 'var(--accent)' }} />
            <span>AI Copilot Insight</span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {type === 'build' ? 'Enable BuildKit layer caching to accelerate rebuilds by up to 45%.' :
             type === 'test' ? 'Run test suites in parallel worker shards to lower execution duration.' :
             type === 'security' ? 'Automated SAST scans detect critical vulnerabilities before cluster rollout.' :
             type === 'deploy' ? 'Zero-downtime rolling update strategy ensures seamless traffic cutover.' :
             type === 'health' ? 'Synthetic HTTP GET probes verify live container responses before finalizing release.' :
             'Ensure all sensitive credentials use OpsPilot AES-256 Vault.'}
          </p>
        </div>

        {/* Label */}
        <Input
          label="Step Name"
          defaultValue={String(data.label ?? '')}
          onChange={(e) => onUpdateNodeData(id, { label: e.target.value })}
        />

        {/* Type-specific inputs */}
        {type === 'source' && (
          <Input
            label="Git Repository / Branch"
            defaultValue={String(data.repo ?? 'workspace/backend:main')}
            onChange={(e) => onUpdateNodeData(id, { repo: e.target.value })}
          />
        )}

        {type === 'build' && (
          <MonacoField
            label="Dockerfile / Image Build"
            language="dockerfile"
            value={`FROM ${String(data.image ?? 'node:20-alpine')}\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nEXPOSE 3000\nCMD ["node", "dist/main.js"]`}
            onChange={(v) => onUpdateNodeData(id, { image: v.split('\n')[0].replace('FROM ', '') })}
            height={130}
          />
        )}

        {type === 'test' && (
          <MonacoField
            label="Test Commands"
            language="shell"
            value={String(data.command ?? 'npm test -- --ci --maxWorkers=4')}
            onChange={(v) => onUpdateNodeData(id, { command: v })}
            height={80}
          />
        )}

        {type === 'security' && (
          <MonacoField
            label="Trivy SAST Scan Command"
            language="shell"
            value="trivy image --severity HIGH,CRITICAL --exit-code 1 ."
            height={60}
          />
        )}

        {type === 'approval' && (
          <Input
            label="Required Approver Role"
            defaultValue={String(data.approvers ?? 'Role: ADMIN / OWNER')}
            onChange={(e) => onUpdateNodeData(id, { approvers: e.target.value })}
          />
        )}

        {type === 'deploy' && (() => {
          const env = resolveDeployEnvironment(data as Record<string, unknown>);
          const envSlug = String(data.target ?? env ?? '').toLowerCase().trim();
          const selectedEnv = environments.find(
            (e) => e.slug.toLowerCase() === envSlug || e.type.toLowerCase() === envSlug,
          );
          const isTargetConfigured = !!(
            (selectedEnv?.clusterName && selectedEnv?.k8sNamespace) ||
            (data.cluster && data.namespace)
          );
          const currentCluster = String(data.cluster ?? selectedEnv?.clusterName ?? '');
          const currentNs = String(data.namespace ?? selectedEnv?.k8sNamespace ?? '');
          const defaultManifest =
            currentNs && currentCluster
              ? `namespace: ${currentNs}\ncluster: ${currentCluster}\nstrategy: RollingUpdate\nmaxSurge: 1\nmaxUnavailable: 0`
              : '# Deployment target not configured in Environment Settings';
          const currentManifest = String(data.manifest ?? defaultManifest);

          return (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Target Environment <span className="text-red-400">*</span>
                </label>
                <select
                  aria-label="Target Environment"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border font-mono transition-colors"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  value={envSlug}
                  onChange={(e) => {
                    const chosenSlug = e.target.value;
                    const matched = environments.find((ev) => ev.slug === chosenSlug);
                    const cluster = matched?.clusterName || '';
                    const namespace = matched?.k8sNamespace || '';
                    const manifest =
                      cluster && namespace
                        ? `namespace: ${namespace}\ncluster: ${cluster}\nstrategy: RollingUpdate\nmaxSurge: 1\nmaxUnavailable: 0`
                        : '# Deployment target not configured in Environment Settings';
                    const command = namespace ? `kubectl apply -f k8s/ --namespace ${namespace}` : '';
                    onUpdateNodeData(id, {
                      target: chosenSlug,
                      namespace,
                      cluster,
                      environment: matched?.name || chosenSlug,
                      manifest,
                      command,
                      label: `Deploy to ${matched?.name || chosenSlug}`,
                    });
                  }}
                >
                  <option value="" disabled>Select Environment...</option>
                  {environments.length > 0 ? (
                    environments.map((e) => {
                      const hasTarget = !!(e.clusterName && e.k8sNamespace);
                      const detail = hasTarget
                        ? `${e.clusterName} / ${e.k8sNamespace}`
                        : 'Deployment target not configured';
                      return (
                        <option key={e.id} value={e.slug}>
                          {e.name} ({detail})
                        </option>
                      );
                    })
                  ) : (
                    <>
                      {env && (
                        <option value={env}>
                          {env.charAt(0).toUpperCase() + env.slice(1)} (
                          {currentCluster && currentNs
                            ? `${currentCluster} / ${currentNs}`
                            : 'Deployment target not configured'}
                          )
                        </option>
                      )}
                    </>
                  )}
                </select>
                {!isTargetConfigured && envSlug && (
                  <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 space-y-1">
                    <p className="flex items-center gap-1 font-medium">
                      <AlertTriangle size={12} /> Deployment target not configured
                    </p>
                    <a
                      href="/settings?tab=environments"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[10px] text-indigo-400 hover:underline font-semibold"
                    >
                      Configure Cluster & Namespace in Settings →
                    </a>
                  </div>
                )}
              </div>

              <MonacoField
                label="Kubernetes Manifest (YAML)"
                language="yaml"
                value={currentManifest}
                onChange={(v) => {
                  const nsMatch = v.match(/namespace:\s*([a-zA-Z0-9_-]+)/);
                  const clusterMatch = v.match(/cluster:\s*([a-zA-Z0-9_-]+)/);
                  const parsedNs = nsMatch ? nsMatch[1].trim() : currentNs;
                  const parsedCluster = clusterMatch ? clusterMatch[1].trim() : currentCluster;
                  onUpdateNodeData(id, {
                    manifest: v,
                    namespace: parsedNs,
                    cluster: parsedCluster,
                    command: parsedNs ? `kubectl apply -f k8s/ --namespace ${parsedNs}` : data.command,
                  });
                }}
                height={110}
              />
            </div>
          );
        })()}

        {type === 'health' && (
          <Input
            label="Health Probe Endpoint"
            defaultValue={String(data.endpoint ?? 'GET /health')}
            onChange={(e) => onUpdateNodeData(id, { endpoint: e.target.value })}
          />
        )}

        {type === 'rollback' && (
          <Input
            label="Rollback Strategy"
            defaultValue={String(data.strategy ?? 'Auto-revert to N-1 deployment')}
            onChange={(e) => onUpdateNodeData(id, { strategy: e.target.value })}
          />
        )}

        {type === 'notification' && (
          <Input
            label="Slack / Webhook Channel"
            defaultValue={String(data.channel ?? '#devops-deployments')}
            onChange={(e) => onUpdateNodeData(id, { channel: e.target.value })}
          />
        )}

        <div className="pt-2 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
          <Input label="Timeout (seconds)" defaultValue="300" />
          <Input label="Retry Attempts" defaultValue="2" />
        </div>
      </div>

      {/* Footer */}
      <div
        className="p-4 border-t flex items-center justify-between shrink-0"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
      >
        <Button onClick={() => onDeleteNode(id)} variant="destructive" size="sm" className="gap-1.5 w-full justify-center">
          <Trash2 size={13} />
          <span>Delete Step</span>
        </Button>
      </div>
    </aside>
  );
}
