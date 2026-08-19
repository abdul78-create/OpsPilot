'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, GitBranch, PlayCircle, Rocket, Sparkles, Settings,
  Search, ArrowRight, Zap, Bot, KeyRound, Terminal, Plus, RotateCcw,
  Activity, FileText, Shield, CreditCard, BookOpen,
} from 'lucide-react';
import { useToast } from './Toast';
import { triggerPipeline, DEFAULT_PIPELINE_ID } from '@/lib/apiClient';

interface CommandPaletteProps {
  onOpenSecretModal?: () => void;
}

interface CommandEntry {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  group: string;
  shortcut?: string;
  keywords?: string;
  action: () => void;
}

export function CommandPalette({ onOpenSecretModal }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Global Cmd+K shortcut ─────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // ── Focus on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setInput('');
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setInput('');
  }, []);

  const run = useCallback((action: () => void) => {
    close();
    action();
  }, [close]);

  // ── Real API actions ──────────────────────────────────────────────────────
  const handleRunPipeline = useCallback(async () => {
    toast({ kind: 'info', title: 'Triggering pipeline...', message: 'Request sent to runner service.' });
    try {
      const res = await triggerPipeline(DEFAULT_PIPELINE_ID, 'main');
      if (res?.data) {
        toast({ kind: 'success', title: 'Pipeline Triggered', message: `Run ID: ${res.data.id.slice(0, 8)} on branch main` });
        router.push(`/runs/${res.data.id}`);
      } else {
        toast({ kind: 'error', title: 'Trigger failed', message: 'No run data returned.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error executing trigger.';
      toast({ kind: 'error', title: 'Trigger error', message: msg });
    }
  }, [toast, router]);

  const handleQuickDeploy = useCallback(async () => {
    toast({ kind: 'info', title: 'Initiating deployment...', message: 'Building production target.' });
    try {
      const res = await triggerPipeline(DEFAULT_PIPELINE_ID, 'main');
      if (res?.data) {
        toast({ kind: 'success', title: 'Deployment Triggered', message: 'Docker build runner started.' });
        router.push(`/runs/${res.data.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not deploy.';
      toast({ kind: 'error', title: 'Deployment error', message: msg });
    }
  }, [toast, router]);

  // ── Command registry ──────────────────────────────────────────────────────
  const commands: CommandEntry[] = [
    // Quick Actions
    {
      id: 'act-run-pipeline',
      label: 'Run Pipeline on main',
      description: 'Trigger an immediate CI/CD build run using isolated Docker runner',
      icon: Zap,
      group: 'Quick Actions',
      shortcut: '↵',
      keywords: 'build deploy trigger test ci execute',
      action: handleRunPipeline,
    },
    {
      id: 'act-quick-deploy',
      label: 'Quick Deploy to Production',
      description: 'Build & deploy the current repository to the production environment',
      icon: Rocket,
      group: 'Quick Actions',
      keywords: 'deploy release production ship live rollout',
      action: handleQuickDeploy,
    },
    {
      id: 'act-new-secret',
      label: 'Add Environment Secret',
      description: 'Store an AES-256-GCM encrypted variable in the Secrets Vault',
      icon: KeyRound,
      group: 'Quick Actions',
      keywords: 'secret env variable key password token api vault',
      action: () => {
        if (onOpenSecretModal) {
          onOpenSecretModal();
        } else {
          router.push('/secrets');
        }
      },
    },
    {
      id: 'act-ai-chat',
      label: 'Open AI Copilot',
      description: 'Ask OpsPilot AI to diagnose logs, explain errors, or optimize configs',
      icon: Sparkles,
      group: 'AI & Intelligence',
      shortcut: 'G A',
      keywords: 'ai assistant rca diagnose analyze copilot fix help bot',
      action: () => router.push('/ai'),
    },

    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Dashboard / Overview',
      description: 'Pipeline health overview, recent runs, system telemetry',
      icon: LayoutDashboard,
      group: 'Navigation',
      shortcut: 'G D',
      keywords: 'home dashboard stats summary telemetry metrics overview',
      action: () => router.push('/dashboard'),
    },
    {
      id: 'nav-pipelines',
      label: 'Pipelines',
      description: 'Manage CI/CD workflows, build steps, trigger options',
      icon: GitBranch,
      group: 'Navigation',
      shortcut: 'G P',
      keywords: 'pipelines workflows ci cd branches steps build',
      action: () => router.push('/pipelines'),
    },
    {
      id: 'nav-runs',
      label: 'Pipeline Runs',
      description: 'Execution history, live stdout log streaming, exit codes',
      icon: PlayCircle,
      group: 'Navigation',
      shortcut: 'G R',
      keywords: 'runs builds history logs execution live jobs terminal',
      action: () => router.push('/runs'),
    },
    {
      id: 'nav-deployments',
      label: 'Deployments',
      description: 'Production releases, health checks, rollback triggers',
      icon: Rocket,
      group: 'Navigation',
      shortcut: 'G E',
      keywords: 'deployments releases rollback production staging environments',
      action: () => router.push('/deployments'),
    },
    {
      id: 'nav-observability',
      label: 'Observability & Metrics',
      description: 'CPU/memory usage, success rates, latency percentiles',
      icon: Activity,
      group: 'Navigation',
      shortcut: 'G O',
      keywords: 'observability metrics telemetry monitoring cpu memory charts',
      action: () => router.push('/observability'),
    },
    {
      id: 'nav-secrets',
      label: 'Secrets Vault',
      description: 'AES-256-GCM encrypted environment variables & API tokens',
      icon: Shield,
      group: 'Navigation',
      shortcut: 'G V',
      keywords: 'secrets keys environment vault aes encryption variables',
      action: () => router.push('/secrets'),
    },
    {
      id: 'nav-artifacts',
      label: 'Build Artifacts',
      description: 'Docker image tags, binary packages, build caches',
      icon: FileText,
      group: 'Navigation',
      keywords: 'artifacts binaries packages docker images downloads files',
      action: () => router.push('/artifacts'),
    },
    {
      id: 'nav-settings',
      label: 'Organization Settings',
      description: 'Team members, RBAC roles, audit logs, workspace config',
      icon: Settings,
      group: 'Navigation',
      shortcut: 'G S',
      keywords: 'settings organization members team rbac roles audit config',
      action: () => router.push('/settings'),
    },
    {
      id: 'nav-billing',
      label: 'Billing & Plans',
      description: 'Subscription tier, usage limits, invoices, upgrade options',
      icon: CreditCard,
      group: 'Navigation',
      keywords: 'billing subscription plan upgrade invoices payment pro',
      action: () => router.push('/billing'),
    },

    // Documentation & Help
    {
      id: 'help-docs',
      label: 'Documentation & Guides',
      description: 'API references, quickstart tutorials, YAML specifications',
      icon: BookOpen,
      group: 'Help & Resources',
      keywords: 'docs documentation help guide api tutorial yaml',
      action: () => router.push('/docs'),
    },
    {
      id: 'help-security',
      label: 'Security & Compliance Whitepaper',
      description: 'SOC2 posture, encryption mechanisms, boundary isolation',
      icon: Shield,
      group: 'Help & Resources',
      keywords: 'security compliance soc2 whitepaper isolation audit',
      action: () => router.push('/security'),
    },
  ];

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = input.trim() === ''
    ? commands
    : commands.filter((c) => {
        const target = `${c.label} ${c.description ?? ''} ${c.keywords ?? ''} ${c.group}`.toLowerCase();
        return target.includes(input.toLowerCase());
      });

  const groups = Array.from(new Set(filtered.map((c) => c.group)));

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm transition-opacity"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {/* Palette panel */}
      <Command
        className="relative w-full max-w-xl border rounded-2xl overflow-hidden animate-slide-up"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
        shouldFilter={false}
      >
        {/* Search bar */}
        <div
          className="flex items-center gap-3 px-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <Search size={15} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
          <Command.Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={input}
            onValueChange={setInput}
            placeholder="Search actions, pages, pipelines..."
            className="flex-1 py-4 bg-transparent text-xs outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd
            className="px-1.5 py-0.5 rounded text-[10px] border font-mono shrink-0"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <Command.List className="max-h-[360px] overflow-y-auto py-2">
          <Command.Empty className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            No commands found for &ldquo;{input}&rdquo;
          </Command.Empty>

          {groups.map((group) => (
            <Command.Group key={group}>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {group}
                </span>
              </div>
              {filtered
                .filter((c) => c.group === group)
                .map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.id}
                    onSelect={() => run(cmd.action)}
                    className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl cursor-pointer transition-all duration-100 group hover:opacity-80"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {/* Icon */}
                    <div
                      className="p-1.5 rounded-lg border transition-colors shrink-0"
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <cmd.icon size={13} />
                    </div>

                    {/* Label & description */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {cmd.label}
                      </div>
                      {cmd.description && (
                        <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                          {cmd.description}
                        </div>
                      )}
                    </div>

                    {/* Shortcut + arrow */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {cmd.shortcut && (
                        <kbd
                          className="text-[10px] font-mono border px-1.5 py-0.5 rounded"
                          style={{
                            background: 'var(--bg-primary)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {cmd.shortcut}
                        </kbd>
                      )}
                      <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </Command.Item>
                ))}
            </Command.Group>
          ))}
        </Command.List>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-t text-[10px] font-mono"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="border px-1 rounded" style={{ borderColor: 'var(--border)' }}>↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border px-1 rounded" style={{ borderColor: 'var(--border)' }}>↵</kbd> Select
            </span>
          </div>
          <div>
            OpsPilot · {filtered.length} of {commands.length}
          </div>
        </div>
      </Command>
    </div>
  );
}
