'use client';

import { Server, Cpu, HardDrive } from 'lucide-react';
import { Badge } from '../ui/badge';

interface WorkerNode {
  id: string;
  name: string;
  region: string;
  status: 'active' | 'idle' | 'offline';
  currentJob?: string;
  cpuUtil: number;
  memUtil: string;
  uptime: string;
}

export function RunnerExecutionPool() {
  const workers: WorkerNode[] = [
    { id: 'w1', name: 'worker-us-east-1a', region: 'us-east-1', status: 'active', currentJob: 'Run #48 · Docker Build (node:20-alpine)', cpuUtil: 42, memUtil: '1.2 GB / 4.0 GB', uptime: '14d 8h' },
    { id: 'w2', name: 'worker-us-east-1b', region: 'us-east-1', status: 'active', currentJob: 'Run #48 · Jest Integration Tests', cpuUtil: 84, memUtil: '2.8 GB / 4.0 GB', uptime: '14d 8h' },
    { id: 'w3', name: 'worker-eu-central-1a', region: 'eu-central-1', status: 'idle', cpuUtil: 4, memUtil: '0.4 GB / 4.0 GB', uptime: '6d 12h' },
  ];

  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server size={16} className="text-blue-400" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">OpsPilot Worker Execution Pool</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Queue Depth: <strong className="text-emerald-400">0</strong></span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Active Runners: <strong className="text-blue-400">2 / 3</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {workers.map((w) => (
          <div key={w.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-200">
                <span className={`w-2 h-2 rounded-full ${w.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{w.name}</span>
              </div>
              <Badge status={w.status === 'active' ? 'healthy' : 'neutral'}>
                {w.status === 'active' ? 'Busy' : 'Idle'}
              </Badge>
            </div>

            {w.currentJob ? (
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-blue-300 truncate">
                ⚡ {w.currentJob}
              </div>
            ) : (
              <div className="p-2 rounded bg-slate-900/40 border border-slate-800/50 text-[11px] font-mono text-slate-500">
                ◌ Waiting for next job...
              </div>
            )}

            <div className="space-y-1.5 text-[11px] font-mono text-slate-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><Cpu size={11} className="text-slate-500" /> CPU Load</span>
                <span className="text-slate-200 font-bold">{w.cpuUtil}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${w.cpuUtil}%` }} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-1"><HardDrive size={11} className="text-slate-500" /> Memory</span>
                <span className="text-slate-300">{w.memUtil}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
