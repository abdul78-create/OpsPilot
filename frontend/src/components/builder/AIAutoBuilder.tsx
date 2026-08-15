'use client';

import React, { useState, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';

interface GeneratedPipeline {
  nodes: Node[];
  edges: Edge[];
}

interface AIAutoBuilderProps {
  onGenerate: (pipeline: GeneratedPipeline) => void;
}

// ─── Pattern-match engine ─────────────────────────────────────────────────────
function generatePipelineFromPrompt(prompt: string): GeneratedPipeline {
  const p = prompt.toLowerCase();

  const hasNext    = p.includes('next') || p.includes('nextjs') || p.includes('next.js');
  const hasNode    = p.includes('node') || p.includes('nodejs') || p.includes('express');
  const hasGo      = p.includes('go ') || p.includes('golang') || p.includes('go api');
  const hasPython  = p.includes('python') || p.includes('fastapi') || p.includes('django') || p.includes('flask');
  const hasDocker  = p.includes('docker') || p.includes('container') || p.includes('image');
  const hasK8s     = p.includes('kubernetes') || p.includes('k8s') || p.includes('helm') || p.includes('cluster');
  const hasRailway = p.includes('railway') || p.includes('vercel') || p.includes('fly') || p.includes('cloud run');
  const hasSecurity= p.includes('security') || p.includes('trivy') || p.includes('sast') || p.includes('scan') || p.includes('vuln');
  const hasTest    = p.includes('test') || p.includes('jest') || p.includes('pytest') || p.includes('spec');
  const hasTerraform = p.includes('terraform') || p.includes('infra') || p.includes('iac');

  let nodeList: Array<{ type: string; label: string; subtext: string }> = [];

  // Always start with source
  nodeList.push({ type: 'source', label: 'Git Repository', subtext: 'main branch trigger' });

  if (hasTerraform) {
    nodeList = [
      { type: 'source', label: 'Git Repository', subtext: 'main branch trigger' },
      { type: 'test',   label: 'tf fmt + validate', subtext: 'terraform fmt -check' },
      { type: 'security', label: 'tfsec / Checkov', subtext: 'IaC vulnerability scan' },
      { type: 'deploy', label: 'Terraform Apply', subtext: 'prod environment' },
      { type: 'notification', label: 'Slack Notify', subtext: '#infra-changes' },
    ];
  } else {
    if (hasTest || hasNext || hasNode || hasGo || hasPython) {
      const testLabel = hasPython
        ? 'PyTest Suite'
        : hasGo
        ? 'Go Test & Vet'
        : hasNext
        ? 'Jest / Vitest'
        : 'Integration Tests';
      const testCmd = hasPython ? 'pytest -v' : hasGo ? 'go test ./...' : 'npm test';
      nodeList.push({ type: 'test', label: testLabel, subtext: testCmd });
    }

    if (hasSecurity) {
      nodeList.push({ type: 'security', label: 'Trivy SAST Scan', subtext: 'CVE vulnerability check' });
    }

    if (hasDocker || hasK8s || hasNext || hasNode || hasGo || hasPython) {
      const image = hasGo ? 'scratch' : hasPython ? 'python:3.12-slim' : 'node:20-alpine';
      nodeList.push({ type: 'build', label: 'Docker Container Build', subtext: `FROM ${image}` });
    }

    if (hasK8s) {
      nodeList.push({ type: 'deploy', label: 'Kubernetes Rollout', subtext: 'prod-us-east-1/default' });
    } else if (hasRailway) {
      const target = p.includes('vercel') ? 'Vercel Edge Deploy' : p.includes('fly') ? 'Fly.io Deploy' : p.includes('cloud run') ? 'GCP Cloud Run Deploy' : 'Railway Deploy';
      nodeList.push({ type: 'deploy', label: target, subtext: 'production environment' });
    } else {
      nodeList.push({ type: 'deploy', label: 'Container Registry Push', subtext: 'docker.io/workspace' });
    }

    nodeList.push({ type: 'notification', label: 'Slack Webhook', subtext: '#deployments' });
  }

  const spacing = 270;
  const nodes: Node[] = nodeList.map((n, i) => ({
    id: `ai-${Date.now()}-${i}`,
    type: n.type,
    position: { x: 50 + i * spacing, y: 160 },
    data: { label: n.label, repo: n.subtext, image: n.subtext, command: n.subtext, target: n.subtext, runState: 'idle' },
  }));

  const edges: Edge[] = nodes.slice(0, -1).map((node, i) => ({
    id: `ai-e-${i}`,
    source: node.id,
    target: nodes[i + 1].id,
    animated: true,
    style: { stroke: 'var(--border-bright)', strokeWidth: 2 },
  }));

  return { nodes, edges };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AIAutoBuilder({ onGenerate }: AIAutoBuilderProps) {
  const [prompt, setPrompt] = useState('');
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setThinking(true);
    // Realistic "AI thinking" delay before revealing nodes
    setTimeout(() => {
      const pipeline = generatePipelineFromPrompt(prompt);
      onGenerate(pipeline);
      setPrompt('');
      setThinking(false);
    }, 1400);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const examples = [
    'Deploy my Next.js app to Railway with Trivy security scan',
    'Go API to Kubernetes with tests and security',
    'FastAPI app to Cloud Run with PyTest',
    'Terraform AWS infrastructure pipeline',
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 select-none">
      <div
        className="rounded-2xl border backdrop-blur-xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-overlay)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 shrink-0">
            {thinking ? (
              <Loader2 size={15} className="animate-spin" style={{ color: 'var(--accent)' }} />
            ) : (
              <Sparkles size={15} style={{ color: 'var(--accent)' }} />
            )}
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>AI Auto Builder</span>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe your pipeline… e.g. 'Deploy my Go API to K8s with Trivy scan'"
            disabled={thinking}
            className="flex-1 bg-transparent text-xs focus:outline-none disabled:opacity-50"
            style={{
              color: 'var(--text-primary)',
            }}
          />

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || thinking}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >
            {thinking ? 'Generating…' : <>Generate <ArrowRight size={12} /></>}
          </button>
        </div>

        {/* Example chips */}
        {!thinking && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => { setPrompt(ex); inputRef.current?.focus(); }}
                className="text-[10px] rounded-full px-2.5 py-1 transition-colors border hover:opacity-80"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {thinking && (
          <div className="px-4 pb-3">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div
                className="h-full rounded-full animate-pulse w-2/3"
                style={{ background: 'var(--accent)' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
