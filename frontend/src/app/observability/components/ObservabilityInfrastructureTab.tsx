'use client';

import React from 'react';
import {
  Server, Database, Box, Layers, HardDrive,
  Cpu, CheckCircle2, Shield, Lock, Radio
} from 'lucide-react';

export const ObservabilityInfrastructureTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* ── Infrastructure Node Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Docker Runner Engine */}
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Docker Sandbox Runner</h4>
                <p className="text-[11px] text-[var(--text-muted)]">Ephemeral Container Isolation</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              Active
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Memory Limit</span>
              <span className="font-mono text-[var(--text-primary)]">2048 MB (2 GB)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">CPU Allocation</span>
              <span className="font-mono text-[var(--text-primary)]">2.0 Core</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">PIDs Limit</span>
              <span className="font-mono text-[var(--text-primary)]">200 processes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Security Options</span>
              <span className="font-mono text-[var(--text-primary)]">no-new-privileges</span>
            </div>
          </div>
        </div>

        {/* PostgreSQL Database */}
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">PostgreSQL Primary</h4>
                <p className="text-[11px] text-[var(--text-muted)]">Relational ACID Vault</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Connection Pool</span>
              <span className="font-mono text-[var(--text-primary)]">Active (10 clients)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Target Schema</span>
              <span className="font-mono text-[var(--text-primary)]">public</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">SSL Mode</span>
              <span className="font-mono text-[var(--text-primary)]">Local / Prefer</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Transactions</span>
              <span className="font-mono text-[var(--text-primary)]">Serializable Isolation</span>
            </div>
          </div>
        </div>

        {/* Redis / BullMQ Subsystem */}
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Redis & BullMQ Engine</h4>
                <p className="text-[11px] text-[var(--text-muted)]">Distributed Job Queue</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              Active
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Queue Name</span>
              <span className="font-mono text-[var(--text-primary)]">pipeline_run_queue</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Lock Strategy</span>
              <span className="font-mono text-[var(--text-primary)]">Redis SET NX Atomic</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Idempotency TTL</span>
              <span className="font-mono text-[var(--text-primary)]">86,400s (24h)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Auto Removal</span>
              <span className="font-mono text-[var(--text-primary)]">On Complete: True</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
