'use client';

import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FolderGit2, CheckCircle2, ArrowRight, Loader2, GitBranch, Check, Sparkles } from 'lucide-react';

interface GitHubAppOnboardingProps {
  open: boolean;
  onClose: () => void;
  onSelectRepo: (repoName: string) => void;
}

interface RepoItem {
  name: string;
  branch: string;
  stack: string[];
  lastCommit: string;
  isInstalled: boolean;
}

export function GitHubAppOnboarding({ open, onClose, onSelectRepo }: GitHubAppOnboardingProps) {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const repos: RepoItem[] = [
    { name: 'acme-corp/backend-api', branch: 'main', stack: ['Node.js 22', 'Docker', 'K8s', 'Jest'], lastCommit: '2h ago', isInstalled: true },
    { name: 'acme-corp/frontend-next', branch: 'main', stack: ['Next.js 15', 'Tailwind', 'Vercel'], lastCommit: '4h ago', isInstalled: true },
    { name: 'acme-corp/data-worker', branch: 'main', stack: ['Python 3.11', 'FastAPI', 'Redis'], lastCommit: '1d ago', isInstalled: true },
  ];

  const handleImport = (repoName: string) => {
    setSelectedRepo(repoName);
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      onSelectRepo(repoName);
      onClose();
    }, 1200);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Connect GitHub Organization & Import Pipeline">
      <div className="space-y-5 select-none">
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <FolderGit2 size={16} className="text-blue-400" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200">OpsPilot GitHub App</span>
              <span className="block text-[10px] font-mono text-emerald-400">● Connected to org: acme-corp</span>
            </div>
          </div>
          <Badge status="healthy">App Active</Badge>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select a Repository to Import</span>
          <div className="space-y-2">
            {repos.map((r) => (
              <div
                key={r.name}
                onClick={() => handleImport(r.name)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedRepo === r.name && importing
                    ? 'bg-blue-900/30 border-blue-500'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-100">
                    <GitBranch size={13} className="text-slate-400" />
                    <span>{r.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{r.lastCommit}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-wrap gap-1">
                    {r.stack.map((s) => (
                      <span key={s} className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {s}
                      </span>
                    ))}
                  </div>

                  {selectedRepo === r.name && importing ? (
                    <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> Scanning & Generating…
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      Import <ArrowRight size={12} />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-800 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
