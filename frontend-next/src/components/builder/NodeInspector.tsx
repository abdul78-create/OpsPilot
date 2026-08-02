'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Node } from '@xyflow/react';
import { SlidersHorizontal, Trash2, Sparkles, X } from 'lucide-react';
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
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="rounded-lg overflow-hidden border border-slate-800 bg-[#1e1e1e]" style={{ height }}>
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
      <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col items-center justify-center p-6 text-center select-none">
        <SlidersHorizontal size={24} className="text-slate-600 mb-2" />
        <h3 className="text-xs font-bold text-slate-300">No Node Selected</h3>
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
          Click any step to inspect properties, performance metrics, and AI optimization suggestions.
        </p>
      </aside>
    );
  }

  const { id, type, data } = selectedNode;

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-slate-400" />
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">{String(data.label ?? type)}</h3>
            <span className="text-[10px] font-mono text-slate-500">ID: {id}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Validation */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Configuration</span>
          <Badge status="healthy">● Valid</Badge>
        </div>

        {/* Performance Metrics */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Step Intelligence</h4>
          <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
            {[['Est. Duration', '2m 18s'], ['Success', '98.4%'], ['Cache Hit', '92%']].map(([label, value]) => (
              <div key={label} className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="block text-[10px] text-slate-500">{label}</span>
                <span className="text-xs font-bold text-slate-200">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Tip */}
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-300">
            <Sparkles size={13} />
            <span>AI Optimization</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Enable Docker BuildKit layer caching to reduce this step by up to 37%.
          </p>
        </div>

        {/* Label */}
        <Input
          label="Step Label"
          defaultValue={String(data.label ?? '')}
          onChange={(e) => onUpdateNodeData(id, { label: e.target.value })}
        />

        {/* Type-specific Monaco fields */}
        {type === 'source' && (
          <Input
            label="Git Repository / Branch"
            defaultValue={String(data.repo ?? 'acme/backend-api:main')}
            onChange={(e) => onUpdateNodeData(id, { repo: e.target.value })}
          />
        )}

        {type === 'build' && (
          <MonacoField
            label="Dockerfile / Image Config"
            language="dockerfile"
            value={`FROM ${String(data.image ?? 'node:20-alpine')}\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nEXPOSE 3000\nCMD ["node", "dist/main.js"]`}
            onChange={(v) => onUpdateNodeData(id, { image: v.split('\n')[0].replace('FROM ', '') })}
            height={160}
          />
        )}

        {type === 'test' && (
          <MonacoField
            label="Test Commands (shell)"
            language="shell"
            value={String(data.command ?? 'npm test -- --ci --maxWorkers=4')}
            onChange={(v) => onUpdateNodeData(id, { command: v })}
            height={80}
          />
        )}

        {type === 'security' && (
          <MonacoField
            label="Scanner Configuration"
            language="shell"
            value="trivy image --severity HIGH,CRITICAL --exit-code 1"
            height={60}
          />
        )}

        {type === 'deploy' && (
          <MonacoField
            label="Kubernetes Manifest (YAML)"
            language="yaml"
            value={`namespace: production\ncluster: ${String(data.target ?? 'prod-us-east-1')}\nstrategy: RollingUpdate\nmaxSurge: 1\nmaxUnavailable: 0`}
            onChange={(v) => onUpdateNodeData(id, { target: v })}
            height={120}
          />
        )}

        <div className="pt-2 border-t border-slate-800 space-y-3">
          <Input label="Timeout (seconds)" defaultValue="300" />
          <Input label="Retry Attempts" defaultValue="2" />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between shrink-0">
        <Button onClick={() => onDeleteNode(id)} variant="destructive" size="sm" className="gap-1.5">
          <Trash2 size={13} />
          <span>Delete Step</span>
        </Button>
      </div>
    </aside>
  );
}
