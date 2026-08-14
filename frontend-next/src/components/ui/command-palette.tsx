'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Command } from 'cmdk';
import {
  Search, GitBranch, Rocket, Activity, Sparkles, Key, Users,
  CreditCard, Settings, BookOpen, Plus, Play, RotateCcw,
  Shield, ArrowRight, Zap, Home, FileText
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  group: string;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  orgId?: string;
}

/**
 * CommandPalette — Cmd+K / Ctrl+K global navigation command palette.
 *
 * Power-user keyboard navigation across all OpsPilot surfaces.
 * Matches Linear, Vercel, and Raycast UX patterns.
 */
export function CommandPalette({ orgId }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Global keyboard shortcut listener ────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // ── Focus search input on open ────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [open]);

  const go = useCallback((path: string) => {
    setOpen(false);
    router.push(path);
  }, [router]);

  // ── Command registry ──────────────────────────────────────────────────────
  const commands: CommandItem[] = [
    // Navigation
    { id: 'home', label: 'Go to Dashboard', icon: Home, group: 'Navigation', shortcut: 'G D', action: () => go('/dashboard'), keywords: ['home', 'start'] },
    { id: 'pipelines', label: 'Pipelines', icon: GitBranch, group: 'Navigation', shortcut: 'G P', action: () => go('/pipelines'), keywords: ['ci', 'build'] },
    { id: 'deployments', label: 'Deployments', icon: Rocket, group: 'Navigation', shortcut: 'G E', action: () => go('/deployments'), keywords: ['release', 'production'] },
    { id: 'runs', label: 'Runs', icon: Play, group: 'Navigation', action: () => go('/runs'), keywords: ['builds', 'jobs'] },
    { id: 'observability', label: 'Observability', icon: Activity, group: 'Navigation', shortcut: 'G O', action: () => go('/observability'), keywords: ['metrics', 'health', 'prometheus'] },
    { id: 'ai', label: 'AI Copilot & RCA', icon: Sparkles, group: 'Navigation', shortcut: 'G A', action: () => go('/ai'), keywords: ['analysis', 'diagnosis', 'failures'] },
    { id: 'secrets', label: 'Secrets Vault', icon: Key, group: 'Navigation', action: () => go('/secrets'), keywords: ['env', 'environment', 'variables', 'aes'] },
    { id: 'artifacts', label: 'Artifacts', icon: FileText, group: 'Navigation', action: () => go('/artifacts'), keywords: ['binaries', 'downloads'] },
    { id: 'settings', label: 'Team & Settings', icon: Settings, group: 'Navigation', shortcut: 'G S', action: () => go('/settings'), keywords: ['organization', 'rbac', 'members'] },
    { id: 'billing', label: 'Billing & Plans', icon: CreditCard, group: 'Navigation', action: () => go('/billing'), keywords: ['subscription', 'upgrade', 'invoice', 'quota'] },

    // Quick Actions
    { id: 'trigger-pipeline', label: 'Trigger Pipeline Run', description: 'Queue a new build run on main branch', icon: Zap, group: 'Quick Actions', action: () => go('/pipelines'), keywords: ['build', 'deploy', 'run', 'start'] },
    { id: 'new-pipeline', label: 'Create New Pipeline', description: 'Auto-compile pipeline from repository', icon: Plus, group: 'Quick Actions', action: () => go('/builder'), keywords: ['create', 'new', 'add'] },
    { id: 'rollback', label: 'Rollback Deployment', description: 'Revert last release to previous version', icon: RotateCcw, group: 'Quick Actions', action: () => go('/deployments'), keywords: ['revert', 'undo', 'previous'] },
    { id: 'invite-member', label: 'Invite Team Member', description: 'Add a collaborator to your organization', icon: Users, group: 'Quick Actions', action: () => go('/settings'), keywords: ['add', 'team', 'collaborator'] },

    // Documentation
    { id: 'docs', label: 'Documentation', icon: BookOpen, group: 'Help', action: () => go('/docs'), keywords: ['help', 'guide', 'tutorial'] },
    { id: 'security', label: 'Security & Compliance', icon: Shield, group: 'Help', action: () => go('/security'), keywords: ['audit', 'compliance', 'soc2'] },
    { id: 'pricing', label: 'Pricing & Plans', icon: CreditCard, group: 'Help', action: () => go('/pricing'), keywords: ['plans', 'upgrade', 'cost'] },
  ];

  const filtered = query.length === 0
    ? commands
    : commands.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.group.toLowerCase().includes(q) ||
          (cmd.description?.toLowerCase().includes(q)) ||
          (cmd.keywords?.some((k) => k.includes(q)))
        );
      });

  const groups = [...new Set(filtered.map((c) => c.group))];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <Command
        className="relative w-full max-w-xl bg-[#111113] border border-[#27272A] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
        shouldFilter={false}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-[#27272A]">
          <Search size={15} className="text-zinc-500 shrink-0" />
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="Search commands, pages, settings..."
            className="flex-1 py-4 bg-transparent text-sm text-white placeholder-zinc-600 outline-none font-sans"
          />
          <div className="text-[10px] font-mono text-zinc-600 border border-zinc-700 px-1.5 py-0.5 rounded">
            ESC
          </div>
        </div>

        {/* Results */}
        <Command.List className="max-h-[400px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <Command.Empty className="py-12 text-center text-sm text-zinc-500">
              No commands found for &ldquo;{query}&rdquo;
            </Command.Empty>
          )}

          {groups.map((group) => (
            <Command.Group key={group} heading={group}>
              <div className="px-3 pt-3 pb-1">
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
                    onSelect={cmd.action}
                    className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl cursor-pointer text-zinc-300 hover:bg-violet-600/10 hover:text-white data-[selected=true]:bg-violet-600/15 data-[selected=true]:text-white transition-all duration-100 group"
                  >
                    <div className="p-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-zinc-500 group-hover:text-violet-400 group-hover:border-violet-500/30 group-data-[selected=true]:text-violet-400 transition-colors">
                      <cmd.icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-[11px] text-zinc-500 truncate">{cmd.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {cmd.shortcut && (
                        <span className="text-[10px] font-mono text-zinc-600">{cmd.shortcut}</span>
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
            <span className="flex items-center gap-1">
              <kbd className="border border-zinc-700 px-1 rounded">Esc</kbd> Close
            </span>
          </div>
          <div className="text-[10px] text-zinc-700 font-mono">
            OpsPilot · {filtered.length} commands
          </div>
        </div>
      </Command>
    </div>
  );
}
