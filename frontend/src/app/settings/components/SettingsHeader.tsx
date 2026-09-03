'use client';

import React from 'react';
import { Settings, Shield, Sparkles, Building2 } from 'lucide-react';
import { Organization, AiStatusResponse } from '@/lib/apiClient';

interface SettingsHeaderProps {
  organization: Organization | null;
  aiStatus: AiStatusResponse | null;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  organization,
  aiStatus,
}) => {
  const isAiConnected = aiStatus?.status === 'connected';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
          <span>Home</span>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-medium">Settings</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Settings</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Manage your OpsPilot account, organization, integrations, security, and platform preferences.
            </p>
          </div>
        </div>
      </div>

      {/* Real Top-level Context summary */}
      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center text-xs">
        {organization && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium">
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>{organization.name}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium">
          <Shield className="w-3.5 h-3.5" />
          <span>Security: Protected</span>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border font-medium ${
          isAiConnected
            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
        }`}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI: {aiStatus?.status === 'connected' ? 'Connected' : 'Active'}</span>
        </div>
      </div>
    </div>
  );
};
