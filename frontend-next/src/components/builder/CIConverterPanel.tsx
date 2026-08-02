'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Node, Edge } from '@xyflow/react';
import { FileCode, Sparkles, ArrowRight, CheckCircle2, Zap, Copy, Layers } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface CIConverterPanelProps {
  onImportPipeline: (nodes: Node[], edges: Edge[]) => void;
  onClose?: () => void;
}

const SAMPLE_GITHUB_ACTIONS = `name: Production Deployment Pipeline
on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source
        uses: actions/checkout@v4

      - name: Run Jest Unit Tests
        run: npm test -- --ci

      - name: Trivy Vulnerability Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'acme/backend:latest'

      - name: Build Docker Container
        run: docker build -t acme/backend:latest .

      - name: Deploy to Kubernetes
        run: kubectl apply -f k8s/deployment.yaml

      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: \${{ job.status }}
`;

export function CIConverterPanel({ onImportPipeline, onClose }: CIConverterPanelProps) {
  const [yamlCode, setYamlCode] = useState(SAMPLE_GITHUB_ACTIONS);
  const [converted, setConverted] = useState(false);
  const [parsedCount, setParsedCount] = useState(6);

  const parseYamlToNodes = (code: string): { nodes: Node[]; edges: Edge[] } => {
    const lines = code.split('\n');
    const steps: Array<{ type: string; label: string; detail: string }> = [];

    // Simple heuristic parser for GitHub / GitLab / CircleCI YAMLs
    lines.forEach((line) => {
      const lower = line.toLowerCase();
      if (lower.includes('checkout') || lower.includes('git clone')) {
        steps.push({ type: 'source', label: 'Git Repository', detail: 'actions/checkout@v4' });
      } else if (lower.includes('test') || lower.includes('jest') || lower.includes('pytest')) {
        steps.push({ type: 'test', label: 'Unit & Integration Tests', detail: 'npm test -- --ci' });
      } else if (lower.includes('trivy') || lower.includes('sast') || lower.includes('security')) {
        steps.push({ type: 'security', label: 'Trivy SAST Scan', detail: 'aquasecurity/trivy-action' });
      } else if (lower.includes('docker build') || lower.includes('build-push-action') || lower.includes('container')) {
        steps.push({ type: 'build', label: 'Docker Container Build', detail: 'acme/backend:latest' });
      } else if (lower.includes('kubectl') || lower.includes('deploy') || lower.includes('helm')) {
        steps.push({ type: 'deploy', label: 'Kubernetes Rollout', detail: 'kubectl apply -f k8s/' });
      } else if (lower.includes('slack') || lower.includes('notify') || lower.includes('webhook')) {
        steps.push({ type: 'notification', label: 'Slack Webhook', detail: '#deployments channel' });
      }
    });

    // Fallback if empty
    if (steps.length === 0) {
      steps.push(
        { type: 'source', label: 'Git Repository', detail: 'main branch' },
        { type: 'test', label: 'Tests', detail: 'npm test' },
        { type: 'build', label: 'Docker Build', detail: 'node:20-alpine' },
        { type: 'deploy', label: 'K8s Deploy', detail: 'production' }
      );
    }

    const spacing = 260;
    const nodes: Node[] = steps.map((s, i) => ({
      id: `ci-${Date.now()}-${i}`,
      type: s.type,
      position: { x: 50 + i * spacing, y: 160 },
      data: { label: s.label, repo: s.detail, image: s.detail, command: s.detail, target: s.detail, runState: 'idle' },
    }));

    const edges: Edge[] = nodes.slice(0, -1).map((node, i) => ({
      id: `ci-e-${i}`,
      source: node.id,
      target: nodes[i + 1].id,
      animated: true,
      style: { stroke: '#38bdf8', strokeWidth: 2 },
    }));

    return { nodes, edges };
  };

  const handleConvert = () => {
    const { nodes, edges } = parseYamlToNodes(yamlCode);
    setParsedCount(nodes.length);
    setConverted(true);
    onImportPipeline(nodes, edges);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200 select-none overflow-hidden">
      {/* Header */}
      <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
        <div className="flex items-center gap-2">
          <FileCode size={16} className="text-blue-400" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">CI Migration Tool</span>
          <Badge status="healthy">GitHub / GitLab / CircleCI</Badge>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto min-h-0">
        <p className="text-xs text-slate-400">
          Paste existing <code className="text-blue-300 font-mono bg-blue-950 px-1 rounded">.github/workflows/*.yml</code> or <code className="text-blue-300 font-mono bg-blue-950 px-1 rounded">.gitlab-ci.yml</code>. OpsPilot parses your steps into a visual builder topology instantly.
        </p>

        {/* Preset sample buttons */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider self-center">Preset Samples:</span>
          <button
            onClick={() => setYamlCode(SAMPLE_GITHUB_ACTIONS)}
            className="text-[10px] font-mono text-slate-300 bg-slate-950 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded transition-colors"
          >
            GitHub Actions (Next.js)
          </button>
          <button
            onClick={() => setYamlCode(`name: GitLab Go CI\nstages:\n  - test\n  - build\n  - deploy\ntest_job:\n  script: go test ./...\nbuild_job:\n  script: docker build -t go-app .\ndeploy_job:\n  script: kubectl apply -f k8s/`)}
            className="text-[10px] font-mono text-slate-300 bg-slate-950 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded transition-colors"
          >
            GitLab CI (Go API)
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-[200px] border border-slate-800 rounded-xl overflow-hidden bg-[#1e1e1e]">
          <MonacoEditor
            language="yaml"
            value={yamlCode}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              wordWrap: 'on',
              tabSize: 2,
              scrollBeyondLastLine: false,
            }}
            onChange={(v) => setYamlCode(v ?? '')}
          />
        </div>

        {/* Conversion Feedback */}
        {converted && (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-blue-300 font-semibold">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Parsed {parsedCount} pipeline steps into Visual Canvas topology</span>
            </div>
            <Badge status="healthy">Imported</Badge>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleConvert}
          variant="primary"
          size="md"
          className="w-full gap-2 font-bold"
        >
          <Sparkles size={14} />
          <span>Convert & Mount on Visual Canvas</span>
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
