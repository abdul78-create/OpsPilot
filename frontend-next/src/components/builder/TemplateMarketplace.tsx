'use client';

import React from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Layers, Zap, Rocket, Box, CheckCircle2, ArrowRight } from 'lucide-react';

export interface TemplateMarketplaceProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
}

export function TemplateMarketplace({ open, onClose, onSelectTemplate }: TemplateMarketplaceProps) {
  const templates = [
    {
      id: 'nextjs-fullstack',
      title: 'Next.js 15 Fullstack CI/CD',
      description: 'ESLint → Jest Unit Tests → Docker Multi-Stage Build → Trivy SAST → Vercel/K8s Deploy',
      tag: 'Popular',
      steps: 5,
      estimatedTime: '2m 30s',
    },
    {
      id: 'nodejs-microservice',
      title: 'Node.js Microservice & Redis',
      description: 'Git Trigger → npm ci → Integration Tests with Redis container → Docker Registry Push',
      tag: 'Backend',
      steps: 4,
      estimatedTime: '1m 45s',
    },
    {
      id: 'go-api-service',
      title: 'Go High-Performance API',
      description: 'Go Vet → Unit Tests → Scratch Container Build → Kubernetes Helm Rollout',
      tag: 'Cloud Native',
      steps: 4,
      estimatedTime: '45s',
    },
    {
      id: 'fastapi-python',
      title: 'FastAPI + PostgreSQL Pipeline',
      description: 'Ruff Linter → PyTest → Container Scan → GCP Cloud Run Deploy',
      tag: 'Python',
      steps: 4,
      estimatedTime: '1m 20s',
    },
    {
      id: 'terraform-infra',
      title: 'Terraform Infrastructure IaC',
      description: 'tf fmt → tf validate → tflint → Security Scan → Terraform Apply',
      tag: 'Infrastructure',
      steps: 5,
      estimatedTime: '3m 10s',
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} title="Pipeline Template Marketplace" className="max-w-2xl">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <p className="text-xs text-slate-400">
          Load pre-configured, production-tested pipeline templates in 1 click.
        </p>

        <div className="grid grid-cols-1 gap-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => {
                onSelectTemplate(tpl.id);
                onClose();
              }}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/80 transition-all flex items-start justify-between gap-4 group cursor-pointer"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                    {tpl.title}
                  </h4>
                  <Badge status="neutral">{tpl.tag}</Badge>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{tpl.description}</p>
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 pt-1">
                  <span>{tpl.steps} Steps</span>
                  <span>•</span>
                  <span>Est. {tpl.estimatedTime}</span>
                </div>
              </div>

              <Button variant="secondary" size="sm" className="shrink-0 gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <span>Use Template</span>
                <ArrowRight size={12} />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
