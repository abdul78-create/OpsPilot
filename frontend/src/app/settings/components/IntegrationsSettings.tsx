'use client';

import React from 'react';
import {
  Layers, ExternalLink, CheckCircle2, AlertCircle,
  GitBranch, Sparkles, Bell, ArrowRight
} from 'lucide-react';
import { AiStatusResponse } from '@/lib/apiClient';
import Link from 'next/link';

interface IntegrationsSettingsProps {
  aiStatus: AiStatusResponse | null;
  onNavigateTab: (tab: any) => void;
}

export const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({
  aiStatus,
  onNavigateTab,
}) => {
  const isAiConnected = aiStatus?.status === 'connected';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Platform Integrations</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Connect external source control systems, cloud providers, and operational monitoring agents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── 1. GitHub Integration ── */}
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">GitHub Integration</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Source code repositories and triggers</p>
                </div>
              </div>

              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>

            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]/50">
                <span className="text-[var(--text-muted)]">Integration Type:</span>
                <span className="font-semibold text-[var(--text-primary)]">GitHub App / REST API</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]/50">
                <span className="text-[var(--text-muted)]">Webhook Security:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">HMAC-SHA256 Verified</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Branch Auto-Discovery:</span>
                <span className="font-semibold text-[var(--text-primary)]">Enabled</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">Connected via GitHub App</span>
            <Link
              href="/repositories"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
            >
              Manage Repositories
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* ── 2. AI Intelligence Engine ── */}
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Intelligence Provider</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Root cause & performance diagnostics</p>
                </div>
              </div>

              <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                isAiConnected
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
                  : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {aiStatus?.status === 'connected' ? 'Connected' : 'Operational'}
              </span>
            </div>

            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]/50">
                <span className="text-[var(--text-muted)]">Active Engine:</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {aiStatus?.provider || 'Deterministic DevOps Heuristic Engine'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]/50">
                <span className="text-[var(--text-muted)]">Model ID:</span>
                <span className="font-mono text-[11px] text-[var(--text-primary)]">
                  {aiStatus?.model || 'opspilot-rule-engine-v2'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Analytical Modes:</span>
                <span className="font-semibold text-indigo-500">4 Workspaces</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">Real-time DAG & log analysis</span>
            <Link
              href="/workspace"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
            >
              Open AI Workspace
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* ── 3. Alert Notification Channels ── */}
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notification Channels</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Slack, PagerDuty, Webhook, and Email</p>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/30">
                Configurable
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Dispatch high-priority incident alerts when pipeline runs fail, deployments are rejected, or security violations occur.
            </p>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">Configured in Alerts</span>
            <button
              onClick={() => onNavigateTab('notifications')}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
            >
              Configure Notifications
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
