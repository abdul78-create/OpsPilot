'use client';

import React, { useState } from 'react';
import { GitBranch, Box, CheckSquare, ShieldCheck, Rocket, Bell, Search, Layers } from 'lucide-react';

interface NodePaletteProps {
  onAddNode: (type: string, label: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const nodeTemplates = [
    { type: 'source', label: 'GitHub Repository', icon: GitBranch, description: 'Git branch trigger' },
    { type: 'build', label: 'Docker Image Build', icon: Box, description: 'Multi-stage container' },
    { type: 'test', label: 'Integration Tests', icon: CheckSquare, description: 'Jest/PyTest suite' },
    { type: 'security', label: 'Trivy Security Scan', icon: ShieldCheck, description: 'Container vulnerability' },
    { type: 'deploy', label: 'Kubernetes Cluster', icon: Rocket, description: 'K8s deployment' },
    { type: 'notification', label: 'Slack Webhook', icon: Bell, description: '#deployments channel' },
  ];

  const filteredTemplates = nodeTemplates.filter((t) =>
    t.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden select-none">
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-slate-300" />
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Step Library</h3>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Filter step templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700"
          />
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.type}
              onClick={() => onAddNode(template.type, template.label)}
              className="w-full text-left p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:bg-slate-800 hover:border-slate-700 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 mb-1">
                <Icon size={14} className="text-slate-300 group-hover:text-white transition-colors" />
                <span className="text-xs font-bold text-slate-200 group-hover:text-white">{template.label}</span>
              </div>
              <p className="text-[10px] text-slate-400 pl-6">{template.description}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
