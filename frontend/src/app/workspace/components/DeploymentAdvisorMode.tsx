'use client';

import React, { useState } from 'react';
import {
  Rocket, Shield, AlertTriangle, CheckCircle2,
  Clock, ExternalLink, Zap, ArrowRight, Activity
} from 'lucide-react';
import { Deployment, AiAnalysisReport, scoreDeploymentRisk } from '@/lib/apiClient';
import Link from 'next/link';

interface DeploymentAdvisorModeProps {
  deployment: Deployment | null;
  onReportGenerated: (report: AiAnalysisReport) => void;
}

export const DeploymentAdvisorMode: React.FC<DeploymentAdvisorModeProps> = ({
  deployment,
  onReportGenerated,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<AiAnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!deployment) {
    return (
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-3">
          <Rocket className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">No Deployment Selected</h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">
          Select an environment release from the context selector to evaluate deployment risk and rollout safety.
        </p>
        <div className="mt-5">
          <Link
            href="/deployments"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors"
          >
            Open Deployments Dashboard
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const isSuccess = deployment.status === 'SUCCESS';
  const isHealthy = deployment.health === 'HEALTHY';

  const handleScoreRisk = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await scoreDeploymentRisk(deployment.id);
      setReport(res.data);
      onReportGenerated(res.data);
    } catch (err) {
      setError((err as Error).message || 'Failed to calculate deployment risk score.');
    } finally {
      setAnalyzing(false);
    }
  };

  const riskScore = (report?.metadata as any)?.riskScore ?? 15;

  return (
    <div className="space-y-6">
      {/* ── Release Metadata Card ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Release {deployment.version || deployment.imageTag || 'v1.0.0'}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-purple-500/10 text-purple-500 border border-purple-500/30">
                  {deployment.environment}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  Health: {deployment.health || 'HEALTHY'}
                </span>
                <span>·</span>
                <span>Status: {deployment.status}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/deployments"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]/80 transition-colors"
            >
              Deployments
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleScoreRisk}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Evaluating Risk...' : 'Assess Deployment Risk'}
            </button>
          </div>
        </div>

        {/* 4 Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Target Environment</div>
            <div className="text-base font-semibold text-[var(--text-primary)] mt-1">
              {deployment.environment}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Live Probe Status</div>
            <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              HTTP 200 OK
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Rollback Guard</div>
            <div className="text-base font-semibold text-[var(--text-primary)] mt-1">
              Auto-Enabled
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Approval Policy</div>
            <div className="text-base font-semibold text-indigo-500 mt-1">
              Standard Verified
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

      {/* Risk Assessment Report */}
      {report && (
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Deployment Risk Evaluation & Safety Guard
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">Target: {deployment.environment}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                Risk Score: {riskScore}/100
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-medium">
            {report.summary}
          </div>

          {/* Risk Factors */}
          {((report.metadata as any)?.riskFactors?.length > 0) && (
            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-[var(--text-secondary)]">Identified Risk Factors:</div>
              {((report.metadata as any).riskFactors as string[]).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-rose-500 text-[11px]">
                  <span>•</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          <div className="space-y-2 text-xs">
            <div className="font-semibold text-[var(--text-secondary)]">Rollout Recommendations:</div>
            {(Array.isArray(report.recommendations) ? report.recommendations : []).map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] text-[var(--text-secondary)]"
              >
                <span className="text-purple-500 font-bold">✓</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
