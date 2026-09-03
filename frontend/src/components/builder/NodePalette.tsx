'use client';

import React, { useState } from 'react';
import {
  GitBranch, Box, CheckSquare, ShieldCheck, Rocket, Bell,
  Search, Layers, Activity, UserCheck, RotateCcw, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface NodePaletteProps {
  onAddNode: (type: string, label: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [collapsed, setCollapsed] = useState(false);

  const nodeTemplates = [
    { type: 'source',       label: 'GitHub Trigger',     category: 'source',   icon: GitBranch,   description: 'Git push & PR trigger' },
    { type: 'build',        label: 'Docker Build',       category: 'build',    icon: Box,         description: 'Build & package container' },
    { type: 'test',         label: 'Jest Test Suite',    category: 'test',     icon: CheckSquare, description: 'Run unit & integration tests' },
    { type: 'security',     label: 'Trivy SAST Scan',    category: 'security', icon: ShieldCheck, description: 'Security & vulnerability audit' },
    { type: 'approval',     label: 'Manual Approval',   category: 'deploy',   icon: UserCheck,   description: 'Human promotion sign-off' },
    { type: 'deploy',       label: 'Cluster Deploy',     category: 'deploy',   icon: Rocket,      description: 'Roll out to environment' },
    { type: 'health',       label: 'Health Check',       category: 'deploy',   icon: Activity,    description: 'Post-deploy HTTP/TCP probe' },
    { type: 'rollback',     label: 'Auto Rollback',      category: 'deploy',   icon: RotateCcw,   description: 'Revert if probe fails' },
    { type: 'notification', label: 'Slack Alert',        category: 'notify',   icon: Bell,        description: 'Dispatch alert notices' },
  ];

  const filteredTemplates = nodeTemplates.filter((t) => {
    const matchesSearch =
      t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = activeCategory === 'all' || t.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  if (collapsed) {
    return (
      <div className="w-12 border-r flex flex-col items-center py-3 bg-[var(--bg-secondary)] border-[var(--border)] select-none">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors mb-3"
          title="Expand Step Library"
        >
          <ChevronRight size={16} />
        </button>
        <div className="writing-mode-vertical text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] rotate-180 mb-4">
          Steps
        </div>
        <div className="flex flex-col gap-2">
          {nodeTemplates.slice(0, 5).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.type}
                onClick={() => onAddNode(t.type, t.label)}
                title={`Add ${t.label}`}
                className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--border-bright)] border border-[var(--border)] transition-all"
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <aside
      className="w-64 border-r flex flex-col h-full overflow-hidden select-none bg-[var(--bg-secondary)] border-[var(--border)]"
    >
      <div className="p-3.5 border-b border-[var(--border)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-[var(--accent)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Steps Library</h3>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            title="Collapse Step Library"
          >
            <ChevronLeft size={14} />
          </button>
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search steps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-7 pl-7 pr-2.5 border rounded-lg text-xs bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-bright)]"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
          {['all', 'source', 'build', 'security', 'deploy'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[10px] px-2 py-0.5 rounded capitalize font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-2.5 overflow-y-auto space-y-1.5">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.type}
              onClick={() => onAddNode(template.type, template.label)}
              className="w-full text-left p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-bright)] transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <div className="p-1 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--accent)] group-hover:scale-105 transition-transform">
                  <Icon size={13} />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{template.label}</span>
              </div>
              <p className="text-[10px] pl-7 truncate text-[var(--text-muted)]">{template.description}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
