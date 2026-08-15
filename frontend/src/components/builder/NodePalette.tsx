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
    { type: 'source',       label: 'GitHub Trigger',     icon: GitBranch,   description: 'Git branch / commit trigger' },
    { type: 'build',        label: 'Docker Build',       icon: Box,         description: 'Build & package container image' },
    { type: 'test',         label: 'Integration Tests',  icon: CheckSquare, description: 'Run unit & end-to-end tests' },
    { type: 'security',     label: 'Trivy Security',     icon: ShieldCheck, description: 'Vulnerability & SAST audit' },
    { type: 'approval',     label: 'Approval Gate',      icon: UserCheck,   description: 'Manual human promotion sign-off' },
    { type: 'deploy',       label: 'Production Deploy',  icon: Rocket,      description: 'Promote artifact to cluster' },
    { type: 'health',       label: 'Health Check',       icon: Activity,    description: 'Post-deploy HTTP/TCP probe' },
    { type: 'rollback',     label: 'Rollback Recovery',  icon: RotateCcw,   description: 'Auto-revert upon probe failure' },
    { type: 'notification', label: 'Slack Webhook',      icon: Bell,        description: 'Dispatch alerts & team notices' },
  ];

  const filteredTemplates = nodeTemplates.filter((t) =>
    t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside
      className="w-64 border-r flex flex-col h-full overflow-hidden select-none"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <div className="p-4 border-b space-y-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Layers size={15} style={{ color: 'var(--accent)' }} />
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Step Library</h3>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search step templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-8 pr-3 border rounded-xl text-xs focus:outline-none"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
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
              className="w-full text-left p-2.5 rounded-xl border transition-all group cursor-pointer hover:opacity-80"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-2.5 mb-0.5">
                <Icon size={14} style={{ color: 'var(--accent)' }} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{template.label}</span>
              </div>
              <p className="text-[10px] pl-6 truncate" style={{ color: 'var(--text-muted)' }}>{template.description}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
