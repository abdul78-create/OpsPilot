'use client';

import React, { useState } from 'react';
import {
  Shield, Lock, AlertTriangle, CheckCircle2,
  XCircle, Zap, ArrowRight, ExternalLink, KeyRound
} from 'lucide-react';
import { PipelineDefinition, PipelineRun, AiAnalysisReport, auditSecurity } from '@/lib/apiClient';
import Link from 'next/link';

interface SecuritySentinelModeProps {
  pipeline: PipelineDefinition | null;
  run: PipelineRun | null;
  onReportGenerated: (report: AiAnalysisReport) => void;
}

export const SecuritySentinelMode: React.FC<SecuritySentinelModeProps> = ({
  pipeline,
  run,
  onReportGenerated,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<AiAnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targetId = run?.id || pipeline?.id;

  if (!targetId) {
    return (
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">No Security Target Selected</h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">
          Select a pipeline or execution run from the context selector to perform automated security scans and secret leak audits.
        </p>
        <div className="mt-5">
          <Link
            href="/secrets"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors"
          >
            Open Secrets Management
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const handleAudit = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await auditSecurity(targetId);
      setReport(res.data);
      onReportGenerated(res.data);
    } catch (err) {
      setError((err as Error).message || 'Failed to execute security audit.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Target Security Posture Card ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Security Guardrails & Compliance Audit
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  AES-256 Vault Active
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
                <span>Target: {run ? `Run #${run.id.slice(0, 8)}` : `Pipeline '${pipeline?.name}'`}</span>
                <span>·</span>
                <span>Scanner: Static Analysis & Secret Redactor</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/secrets"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]/80 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Secrets Vault
            </Link>

            <button
              onClick={handleAudit}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Scanning Target...' : 'Run Security Audit'}
            </button>
          </div>
        </div>

        {/* 4 Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Encryption Standard</div>
            <div className="text-base font-semibold text-[var(--text-primary)] mt-1">
              AES-256-GCM
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Log Redaction</div>
            <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              Enforced
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Container Sandbox</div>
            <div className="text-base font-semibold text-[var(--text-primary)] mt-1">
              no-new-privileges
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">SAST Pipeline Policy</div>
            <div className="text-base font-semibold text-indigo-500 mt-1">
              Trivy Compatible
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Security Audit Report Card */}
      {report && (
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${report.riskLevel === 'CRITICAL' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Security Audit Report & Vulnerability Scan
              </h3>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              Risk Level: {report.riskLevel}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-medium">
            {report.summary}
          </div>

          {/* Vulnerabilities */}
          <div className="space-y-2 text-xs">
            <div className="font-semibold text-[var(--text-secondary)]">Vulnerability Findings:</div>
            {((report.metadata as any)?.vulnerabilitiesFound?.length > 0) ? (
              ((report.metadata as any).vulnerabilitiesFound as string[]).map((v, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                  {v}
                </div>
              ))
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                No plaintext secrets or high-severity vulnerabilities found.
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="space-y-2 text-xs">
            <div className="font-semibold text-[var(--text-secondary)]">Security Hardening Recommendations:</div>
            {(Array.isArray(report.recommendations) ? report.recommendations : []).map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] text-[var(--text-secondary)]"
              >
                <span className="text-emerald-500 font-bold">✓</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
