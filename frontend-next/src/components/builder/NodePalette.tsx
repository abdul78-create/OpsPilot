'use client';

import React, { useState } from 'react';
import {
  GitBranch, Box, CheckSquare, ShieldCheck, Rocket, Bell,
  Search, Layers, Activity, UserCheck, RotateCcw
} from 'lucide-react';

interface NodePaletteProps {
  onAddNode: (type: string, label: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const nodeTemplates = [
    { type: 'source',       label: 'GitHub Trigger',     icon: GitBranch,   color: 'text-violet-400', description: 'Git branch / commit trigger' },
    { type: 'build',        label: 'Docker Build',       icon: Box,         color: 'text-blue-400',   description: 'Build & package container image' },
    { type: 'test',         label: 'Integration Tests',  icon: CheckSquare, color: 'text-emerald-400',description: 'Run unit & end-to-end tests' },
    { type: 'security',     label: 'Trivy Security',     icon: ShieldCheck, color: 'text-amber-400',  description: 'Vulnerability & SAST audit' },
    { type: 'approval',     label: 'Approval Gate',      icon: UserCheck,   color: 'text-yellow-400', description: 'Manual human promotion sign-off' },
    { type: 'deploy',       label: 'Production Deploy',  icon: Rocket,      color: 'text-purple-400', description: 'Promote artifact to cluster' },
    { type: 'health',       label: 'Health Check',       icon: Activity,    color: 'text-teal-400',   description: 'Post-deploy HTTP/TCP probe' },
    { type: 'rollback',     label: 'Rollback Recovery',  icon: RotateCcw,   color: 'text-rose-400',   description: 'Auto-revert upon probe failure' },
    { type: 'notification', label: 'Slack Webhook',      icon: Bell,        color: 'text-indigo-400', description: 'Dispatch alerts & team notices' },
  ];

  const filteredTemplates = nodeTemplates.filter((t) =>
    t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-64 bg-[#09090B] border-r border-[#27272A] flex flex-col h-full overflow-hidden select-none">
      <div className="p-4 border-b border-[#27272A] space-y-3">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-violet-400" />
          <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Step Library</h3>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search step templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-[#111113] border border-[#27272A] rounded-xl text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-1.5">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.type}
              onClick={() => onAddNode(template.type, template.label)}
              className="w-full text-left p-2.5 rounded-xl bg-[#111113] border border-[#27272A] hover:border-violet-500/40 hover:bg-violet-950/10 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 mb-0.5">
                <Icon size={14} className={`${template.color} group-hover:scale-110 transition-transform`} />
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">{template.label}</span>
              </div>
              <p className="text-[10px] text-zinc-500 pl-6 line-clamp-1">{template.description}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
