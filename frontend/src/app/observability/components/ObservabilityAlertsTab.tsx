'use client';

import React from 'react';
import { AlertTriangle, Bell, Shield, CheckCircle2, Radio } from 'lucide-react';

export const ObservabilityAlertsTab: React.FC = () => {
  return (
    <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-8 shadow-sm text-center">
      <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
        <Bell className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">No Active Incidents</h3>
      <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">
        All pipeline deliveries and services are currently within operational parameters.
      </p>

      <div className="mt-6 max-w-md mx-auto p-4 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-left space-y-2">
        <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-indigo-500" />
          Alert Policies Configured
        </div>
        <div className="text-[11px] text-[var(--text-muted)] flex items-center justify-between">
          <span>Failed Pipeline Run</span>
          <span className="text-emerald-500 font-medium">Active</span>
        </div>
        <div className="text-[11px] text-[var(--text-muted)] flex items-center justify-between">
          <span>Deployment Health Check Timeout (60s)</span>
          <span className="text-emerald-500 font-medium">Active</span>
        </div>
        <div className="text-[11px] text-[var(--text-muted)] flex items-center justify-between">
          <span>Worker Execution Failure</span>
          <span className="text-emerald-500 font-medium">Active</span>
        </div>
      </div>
    </div>
  );
};
