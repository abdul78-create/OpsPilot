'use client';

import React from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { ArrowRight } from 'lucide-react';

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
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Select a verified production template to instantiate a ready-to-run pipeline DAG instantly.
        </p>

        <div className="grid grid-cols-1 gap-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-xl border transition-all flex items-start justify-between gap-4 group"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t.title}</h4>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded border"
                    style={{
                      background: 'var(--bg-primary)',
                      borderColor: 'var(--border)',
                      color: 'var(--accent)',
                    }}
                  >
                    {t.tag}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>
                <div className="flex items-center gap-4 text-[10px] pt-1" style={{ color: 'var(--text-muted)' }}>
                  <span>{t.steps} steps</span>
                  <span>•</span>
                  <span>Est. runtime: {t.estimatedTime}</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onSelectTemplate(t.id);
                  onClose();
                }}
                className="gap-1 text-xs shrink-0 self-center"
              >
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
