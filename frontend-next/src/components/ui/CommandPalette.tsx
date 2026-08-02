'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, GitBranch, Workflow, PlayCircle,
  Rocket, Sparkles, Settings, Search, ArrowRight, Zap, Bot,
  KeyRound, ShieldCheck, HelpCircle, Terminal, Plus,
} from 'lucide-react';
import { useToast } from './Toast';
import { triggerPipeline, DEFAULT_PIPELINE_ID } from '@/lib/apiClient';

interface CommandPaletteProps {
  onOpenSecretModal?: () => void;
}

export function CommandPalette({ onOpenSecretModal }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [generateMode, setGenerateMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const close = () => {
    setOpen(false);
    setInput('');
    setGenerateMode(false);
    setGenerating(false);
  };

  const runCommand = (cmd: () => void) => {
    close();
    cmd();
  };

  const handleRunPipeline = async () => {
    toast({ kind: 'info', title: 'Triggering pipeline...', message: 'Request sent to runner service.' });
    try {
      const res = await triggerPipeline(DEFAULT_PIPELINE_ID, 'main');
      if (res && res.data) {
        toast({
          kind: 'success',
          title: 'Pipeline Triggered Successfully',
          message: `Run ID: ${res.data.id.slice(0, 8)} on branch main`,
        });
        router.push(`/runs/${res.data.id}`);
      } else {
        toast({ kind: 'error', title: 'Failed to trigger pipeline', message: 'No run data returned.' });
      }
    } catch (err: any) {
      toast({ kind: 'error', title: 'Trigger error', message: err.message || 'Error executing trigger.' });
    }
  };

  const handleQuickDeploy = async () => {
    toast({ kind: 'info', title: 'Initiating quick deployment...', message: 'Building production target.' });
    try {
      const res = await triggerPipeline(DEFAULT_PIPELINE_ID, 'main');
      if (res && res.data) {
        toast({
          kind: 'success',
          title: 'Deployment Triggered',
          message: `Docker build runner started for StockFlow.`,
        });
        router.push(`/runs/${res.data.id}`);
      }
    } catch (err: any) {
      toast({ kind: 'error', title: 'Deployment error', message: err.message || 'Could not deploy.' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#09090B]/85 backdrop-blur-md flex items-start justify-center pt-24 px-4 transition-all duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="w-full max-w-xl bg-[#111113] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden animate-slide-up delay-75">
        <Command className="w-full bg-transparent text-zinc-200">
          
          {/* Header Input */}
          <div className="flex items-center gap-3 border-b border-[#1C1C1F] px-4 py-3">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <Command.Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              autoFocus
              value={input}
              onValueChange={setInput}
              onKeyDown={handleKeyDown}
              placeholder="Search actions, pages, and projects... (e.g. settings, secrets, deploy)"
              className="w-full bg-transparent text-sm placeholder-zinc-600 focus:outline-none text-zinc-200"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <kbd className="text-[10px] font-mono bg-[#18181B] text-zinc-500 px-1.5 py-0.5 rounded border border-[#27272A]">
                ESC
              </kbd>
            </div>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-8 text-center text-xs text-zinc-500">
              No matching commands or actions found.
            </Command.Empty>

            {/* QUICK ACTIONS */}
            <Command.Group heading="Quick Actions" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-2.5 py-1.5">
              <Command.Item
                onSelect={() => runCommand(handleRunPipeline)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer group"
              >
                <Zap className="w-3.5 h-3.5 text-violet-400 group-hover:scale-105 transition-transform" />
                <span>Run Pipeline (StockFlow)</span>
                <kbd className="ml-auto text-[10px] font-mono bg-[#18181B] text-zinc-500 px-1.5 py-0.5 rounded border border-[#27272A]">⏎</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(handleQuickDeploy)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer group"
              >
                <Rocket className="w-3.5 h-3.5 text-blue-400 group-hover:scale-105 transition-transform" />
                <span>Deploy to Production</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => {
                  if (onOpenSecretModal) {
                    onOpenSecretModal();
                  } else {
                    router.push('/secrets?create=true');
                  }
                })}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer group"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400 group-hover:scale-105 transition-transform" />
                <span>Create Secret Variable</span>
                <kbd className="ml-auto text-[10px] font-mono bg-[#18181B] text-zinc-500 px-1.5 py-0.5 rounded border border-[#27272A]">+</kbd>
              </Command.Item>
            </Command.Group>

            {/* PAGES NAVIGATION */}
            <Command.Group heading="Navigate Pages" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-2.5 py-1.5 border-t border-[#1C1C1F] mt-2 pt-2">
              {[
                { label: 'Overview / Dashboard', icon: LayoutDashboard, path: '/' },
                { label: 'Pipelines Grid', icon: GitBranch, path: '/pipelines' },
                { label: 'Execution Runs List', icon: PlayCircle, path: '/runs' },
                { label: 'Deployments Control', icon: Rocket, path: '/deployments' },
                { label: 'Observability & Metrics', icon: Workflow, path: '/observability' },
                { label: 'Secrets Configuration', icon: KeyRound, path: '/secrets' },
                { label: 'Project Settings', icon: Settings, path: '/settings' },
                { label: 'AI Workspace Agent', icon: Bot, path: '/workspace' },
              ].map(({ label, icon: Icon, path }) => (
                <Command.Item
                  key={path}
                  onSelect={() => runCommand(() => router.push(path))}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200" />
                  <span>{label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* PROJECTS */}
            <Command.Group heading="Projects" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-2.5 py-1.5 border-t border-[#1C1C1F] mt-2 pt-2">
              <Command.Item
                onSelect={() => runCommand(() => router.push('/pipelines'))}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-zinc-600" />
                <span>StockFlow Microservice</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

        </Command>
      </div>
    </div>
  );
}
