'use client';

import React from 'react';
import {
  Sparkles, CheckCircle2, Shield, Cpu,
  Zap, ArrowRight, ExternalLink, Activity
} from 'lucide-react';
import { AiStatusResponse } from '@/lib/apiClient';
import Link from 'next/link';

interface AiSettingsProps {
  aiStatus: AiStatusResponse | null;
}

export const AiSettings: React.FC<AiSettingsProps> = ({ aiStatus }) => {
  const isConnected = aiStatus?.status === 'connected';

  const capabilities = aiStatus?.capabilities || [
    'Pipeline Bottleneck Optimization',
    'Execution Failure Root Cause Analysis (RCA)',
    'Pre-deployment Risk Scoring (0-100)',
    'Vault & Secrets Compliance Auditing',
    'AI DAG Generation & Visual Builder Export',
    'Contextual Platform Q&A Assistant',
  ];

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">AI Intelligence & Heuristics</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Inspect configured AI orchestration providers, active models, and automated diagnostic capabilities.
        </p>
      </div>

      {/* ── Status Card ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active AI Provider</h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {aiStatus?.provider || 'Deterministic DevOps Heuristic Engine'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold border ${
              isConnected
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              {isConnected ? 'Connected' : 'Operational'}
            </span>
          </div>
        </div>

        {/* Configuration Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]/60 space-y-1">
            <div className="text-[11px] text-[var(--text-muted)]">Engine Model</div>
            <div className="font-mono font-semibold text-[var(--text-primary)]">
              {aiStatus?.model || 'opspilot-rule-engine-v2'}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]/60 space-y-1">
            <div className="text-[11px] text-[var(--text-muted)]">Inference Mode</div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Low Latency Stream
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]/60 space-y-1">
            <div className="text-[11px] text-[var(--text-muted)]">Safety Policy</div>
            <div className="font-semibold text-indigo-500 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Recommendation Guard
            </div>
          </div>
        </div>

        {/* Capabilities Checklist */}
        <div className="space-y-3 pt-2">
          <div className="font-semibold text-[var(--text-primary)]">Active Capabilities</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {capabilities.map((cap, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-secondary)]/30 border border-[var(--border-subtle)]/40 text-[11px] text-[var(--text-secondary)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action button */}
        <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)]">
            AI recommendations never mutate production without user review.
          </span>
          <Link
            href="/workspace"
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
          >
            Launch AI Workspace
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
