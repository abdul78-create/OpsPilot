'use client';

import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { GitPullRequest, ShieldAlert, Zap, Check, Copy, AlertTriangle, ArrowDownRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface PipelineReviewModalProps {
  open: boolean;
  onClose: () => void;
}

export function PipelineReviewModal({ open, onClose }: PipelineReviewModalProps) {
  const [copied, setCopied] = useState(false);

  const prMarkdown = `### 🚀 OpsPilot AI — Pipeline Review Summary

| Metric | Current | Optimized | Change |
| :--- | :--- | :--- | :--- |
| **Est. Duration** | 16m 20s | **9m 40s** | ⚡ **-40.8% faster** |
| **Reliability Score** | 84% | **96%** | ↑ +12% |
| **Security Audit** | 1 Warning | **0 Warnings** | Trivy SAST added |

#### 🔍 Audit Findings & Recommendations:
- ✅ **Layer Caching**: Docker BuildKit cache enabled (saves ~4m 10s)
- ⚠️ **Security**: Trivy SAST vulnerability scan inserted before rollout
- ✅ **Rollback**: Kubernetes auto-rollback policy configured for deployment failure
`;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(prMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Pipeline PR Review & Optimization Report">
      <div className="space-y-5 select-none">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center gap-2">
            <GitPullRequest size={16} className="text-blue-400" />
            <div>
              <span className="text-xs font-bold text-slate-200">PR #231 — Pipeline Refactor</span>
              <span className="block text-[10px] font-mono text-slate-500">my-org/backend-service:main</span>

            </div>
          </div>
          <Badge status="healthy">● Ready for Merge</Badge>
        </div>

        {/* Runtime Performance Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Estimated Duration</span>
            <div className="flex items-center justify-center gap-1 text-sm font-bold text-slate-200 font-mono">
              <span className="line-through text-slate-500 text-xs">16m 20s</span>
              <ArrowDownRight size={14} className="text-emerald-400" />
              <span className="text-emerald-400">9m 40s</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400/90 block mt-0.5">⚡ 40.8% faster</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Reliability Score</span>
            <span className="text-base font-bold text-slate-200 font-mono">96%</span>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">High Stability</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Security Audit</span>
            <span className="text-base font-bold text-emerald-400 font-mono">Passed</span>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">0 Blockers</span>
          </div>
        </div>

        {/* Actionable Findings */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Automated Review Audit Checklist</span>
          
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
              <Zap size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-200">BuildKit Cache Enabled</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Docker layer caching configured. Reduces build step by ~4m 10s on warm cache.</p>
              </div>
              <Badge status="healthy">Optimized</Badge>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
              <ShieldAlert size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-200">Trivy SAST Security Scan Active</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Vulnerability scanner blocks deployment if HIGH or CRITICAL CVEs are detected.</p>
              </div>
              <Badge status="healthy">Verified</Badge>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
              <CheckCircle2 size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-200">K8s Deployment Rollback Safety</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Automated rollback policy configured on health check failure.</p>
              </div>
              <Badge status="healthy">Active</Badge>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <Button variant="secondary" size="sm" onClick={handleCopyMarkdown} className="gap-1.5 font-mono text-xs">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'PR Comment Copied!' : 'Copy PR Markdown Comment'}</span>
          </Button>

          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
