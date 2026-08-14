'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Node } from '@xyflow/react';
import { SlidersHorizontal, Trash2, Sparkles, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

// SSR-safe Monaco — requires browser APIs
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface NodeInspectorProps {
  selectedNode: Node | null;
  onUpdateNodeData: (id: string, data: Record<string, unknown>) => void;
  onDeleteNode: (id: string) => void;
  onClose: () => void;
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
      <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</label>
      <div className="rounded-xl overflow-hidden border border-[#27272A] bg-[#09090B]" style={{ height }}>
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

export function NodeInspector({ selectedNode, onUpdateNodeData, onDeleteNode, onClose }: NodeInspectorProps) {
  if (!selectedNode) {
    return (
      <aside className="w-80 bg-[#09090B] border-l border-[#27272A] flex flex-col items-center justify-center p-6 text-center select-none">
        <SlidersHorizontal size={24} className="text-zinc-600 mb-2" />
        <h3 className="text-xs font-bold text-zinc-300">No Step Selected</h3>
        <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
          Click any step in the canvas to inspect properties, configure execution commands, and view AI recommendations.
        </p>
      </aside>
    );
  }

  const { id, type, data } = selectedNode;

  return (
    <aside className="w-80 bg-[#09090B] border-l border-[#27272A] flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="h-14 px-4 border-b border-[#27272A] flex items-center justify-between shrink-0 bg-[#111113]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-violet-400" />
          <div>
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">{String(data.label ?? type)}</h3>
            <span className="text-[10px] font-mono text-zinc-500">ID: {id}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Step Status Pill */}
        <div className="p-2.5 rounded-xl bg-[#111113] border border-[#27272A] flex items-center justify-between text-xs">
          <span className="text-zinc-400">Step Status</span>
          <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded-md flex items-center gap-1">
            <CheckCircle2 size={10} /> Validated
          </span>
        </div>

        {/* AI Tip */}
        <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-800/40 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-violet-300">
            <Sparkles size={13} className="text-violet-400" />
            <span>AI Copilot Insight</span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
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

        {type === 'deploy' && (
          <MonacoField
            label="Kubernetes Manifest (YAML)"
            language="yaml"
            value={`namespace: ${String(data.target ?? 'production')}\ncluster: prod-us-east-1\nstrategy: RollingUpdate\nmaxSurge: 1\nmaxUnavailable: 0`}
            onChange={(v) => onUpdateNodeData(id, { target: v })}
            height={110}
          />
        )}

        {type === 'health' && (
          <Input
            label="Health Probe Endpoint"
            defaultValue={String(data.endpoint ?? 'GET http://localhost:8080/health')}
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

        <div className="pt-2 border-t border-[#27272A] space-y-3">
          <Input label="Timeout (seconds)" defaultValue="300" />
          <Input label="Retry Attempts" defaultValue="2" />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-[#111113] border-t border-[#27272A] flex items-center justify-between shrink-0">
        <Button onClick={() => onDeleteNode(id)} variant="destructive" size="sm" className="gap-1.5 w-full justify-center">
          <Trash2 size={13} />
          <span>Delete Step</span>
        </Button>
      </div>
    </aside>
  );
}
