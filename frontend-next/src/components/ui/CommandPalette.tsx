'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, GitBranch, PlayCircle, Rocket, Sparkles, Settings,
  Search, ArrowRight, Zap, Bot, KeyRound, Terminal, Plus, RotateCcw,
  Activity, FileText, Shield, CreditCard, BookOpen, Users, Home,
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
  icon: React.ComponentType<{ size?: number; className?: string }>;
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
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
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

  // ── Real API actions (preserved from original) ────────────────────────────
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
    { id: 'run-pipeline', label: 'Trigger Pipeline Run', description: 'Queue a build on branch main', icon: Zap, group: 'Quick Actions', shortcut: '⏎', keywords: 'build ci run start trigger', action: handleRunPipeline },
    { id: 'deploy', label: 'Deploy to Production', description: 'Start a Docker build runner', icon: Rocket, group: 'Quick Actions', keywords: 'deploy release prod', action: handleQuickDeploy },
    { id: 'secret', label: 'Create Secret Variable', description: 'Add AES-256 encrypted env var', icon: KeyRound, group: 'Quick Actions', shortcut: '+', keywords: 'secret env variable aes', action: () => { if (onOpenSecretModal) onOpenSecretModal(); else router.push('/secrets?create=true'); } },
    { id: 'rollback', label: 'Rollback Last Deployment', description: 'Revert to previous release', icon: RotateCcw, group: 'Quick Actions', keywords: 'rollback revert undo', action: () => router.push('/deployments') },
    { id: 'new-pipeline', label: 'Create New Pipeline', description: 'Auto-compile from repository', icon: Plus, group: 'Quick Actions', keywords: 'new add create pipeline', action: () => router.push('/builder') },

    // Navigation
    { id: 'dashboard', label: 'Dashboard', icon: Home, group: 'Navigate', shortcut: 'G D', keywords: 'home overview', action: () => router.push('/dashboard') },
    { id: 'pipelines', label: 'Pipelines', icon: GitBranch, group: 'Navigate', shortcut: 'G P', keywords: 'ci build pipelines', action: () => router.push('/pipelines') },
    { id: 'runs', label: 'Runs', icon: PlayCircle, group: 'Navigate', keywords: 'builds jobs executions', action: () => router.push('/runs') },
    { id: 'deployments', label: 'Deployments', icon: Rocket, group: 'Navigate', shortcut: 'G E', keywords: 'releases deployment', action: () => router.push('/deployments') },
    { id: 'observability', label: 'Observability', icon: Activity, group: 'Navigate', shortcut: 'G O', keywords: 'metrics health prometheus', action: () => router.push('/observability') },
    { id: 'ai', label: 'AI Copilot & RCA', icon: Sparkles, group: 'Navigate', shortcut: 'G A', keywords: 'ai rca analysis copilot', action: () => router.push('/ai') },
    { id: 'workspace', label: 'AI Workspace', icon: Bot, group: 'Navigate', keywords: 'ai workspace agent', action: () => router.push('/workspace') },
    { id: 'artifacts', label: 'Artifacts', icon: FileText, group: 'Navigate', keywords: 'binaries downloads', action: () => router.push('/artifacts') },
    { id: 'secrets', label: 'Secrets Vault', icon: KeyRound, group: 'Navigate', keywords: 'env secret vault aes', action: () => router.push('/secrets') },
    { id: 'settings', label: 'Team & Settings', icon: Settings, group: 'Navigate', shortcut: 'G S', keywords: 'team org rbac settings', action: () => router.push('/settings') },
    { id: 'billing', label: 'Billing & Plans', icon: CreditCard, group: 'Navigate', keywords: 'billing stripe quota', action: () => router.push('/billing') },
    { id: 'terminal', label: 'Pipeline Terminal', icon: Terminal, group: 'Navigate', keywords: 'terminal logs xterm', action: () => router.push('/runs') },
    { id: 'members', label: 'Team Members', icon: Users, group: 'Navigate', keywords: 'members team rbac', action: () => router.push('/settings') },

    // Help
    { id: 'docs', label: 'Documentation', icon: BookOpen, group: 'Help', keywords: 'docs guide tutorial', action: () => router.push('/docs') },
    { id: 'security', label: 'Security & Compliance', icon: Shield, group: 'Help', keywords: 'security audit soc2', action: () => router.push('/security') },
  ];

  const filtered = input.trim().length === 0
    ? commands
    : commands.filter((c) => {
        const q = input.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.keywords?.toLowerCase().includes(q) ||
          c.group.toLowerCase().includes(q)
        );
      });

  const groups = [...new Set(filtered.map((c) => c.group))];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      {/* Palette panel */}
      <Command
        className="relative w-full max-w-xl bg-[#111113] border border-[#27272A] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        shouldFilter={false}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 border-b border-[#27272A]">
          <Search size={15} className="text-zinc-500 shrink-0" />
          <Command.Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={input}
            onValueChange={setInput}
            placeholder="Search actions, pages, pipelines..."
            className="flex-1 py-4 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[#18181B] text-[10px] text-zinc-500 border border-[#27272A] font-mono shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <Command.List className="max-h-[400px] overflow-y-auto py-2">
          <Command.Empty className="py-12 text-center text-sm text-zinc-500">
            No commands found for &ldquo;{input}&rdquo;
          </Command.Empty>

          {groups.map((group) => (
            <Command.Group key={group}>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
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
                    className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl cursor-pointer text-zinc-300 hover:bg-violet-600/10 hover:text-white data-[selected=true]:bg-violet-600/15 data-[selected=true]:text-white transition-all duration-100 group"
                  >
                    {/* Icon */}
                    <div className="p-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-zinc-500 group-hover:text-violet-400 group-hover:border-violet-500/30 group-data-[selected=true]:text-violet-400 transition-colors shrink-0">
                      <cmd.icon size={13} />
                    </div>

                    {/* Label & description */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-[11px] text-zinc-500 truncate">{cmd.description}</div>
                      )}
                    </div>

                    {/* Shortcut + arrow */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {cmd.shortcut && (
                        <kbd className="text-[10px] font-mono text-zinc-600 border border-zinc-700/40 px-1.5 py-0.5 rounded bg-[#18181B]">
                          {cmd.shortcut}
                        </kbd>
                      )}
                      <ArrowRight size={12} className="text-zinc-700 group-hover:text-zinc-400 group-data-[selected=true]:text-zinc-400 transition-colors" />
                    </div>
                  </Command.Item>
                ))}
            </Command.Group>
          ))}
        </Command.List>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#27272A] bg-[#0D0D0F]">
          <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-600">
            <span className="flex items-center gap-1">
              <kbd className="border border-zinc-700 px-1 rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-zinc-700 px-1 rounded">↵</kbd> Select
            </span>
          </div>
          <div className="text-[10px] text-zinc-700 font-mono">
            OpsPilot · {filtered.length} of {commands.length}
          </div>
        </div>
      </Command>
    </div>
  );
}
