'use client';

import React, { useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { DeveloperShell } from '../layout/DeveloperShell';
import { MetricCard } from '../domain/MetricCard';
import { InspectorPanel } from '../domain/InspectorPanel';
import { TerminalPanel } from '../domain/TerminalPanel';
import { TimelinePanel } from '../domain/TimelinePanel';
import { PropertiesPanel } from '../domain/PropertiesPanel';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ErrorBanner } from '../ui/error-boundary';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { 
  Zap, 
  Rocket, 
  Package, 
  Sparkles, 
  GitBranch, 
  Play, 
  RotateCcw, 
  Sliders, 
  Terminal, 
  FileCode, 
  Activity 
} from 'lucide-react';

export function DeliveryWorkspace() {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'ai' | 'variables'>('overview');
  const [inspectorOpen, setInspectorOpen] = useState(true);

  // Global Keyboard Shortcuts
  useKeyboardShortcuts({
    onToggleInspector: () => setInspectorOpen((prev) => !prev),
  });

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-4">
        {/* TOP WORKSPACE CONTROL BAR */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 flex items-center justify-center font-mono text-sm font-bold">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-100 tracking-tight">main-ci-build</h1>
                <Badge status="healthy">● Healthy</Badge>
                <span className="text-xs font-mono text-slate-400">acme-corp/backend-api</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1 font-mono"><GitBranch size={12} /> main</span>
                <span>•</span>
                <span>Commit <code className="font-mono bg-slate-950 px-1 py-0.2 rounded border border-slate-800">89a20b</code></span>
                <span>•</span>
                <span>Triggered 5m ago</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Keyboard Hints */}
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <RotateCcw size={13} />
              <span>Re-run Pipeline</span>
            </Button>
            <Button variant="primary" size="sm" className="gap-1.5">
              <Play size={13} />
              <span>Run Manual Job</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setInspectorOpen(!inspectorOpen)}
              className="gap-1.5"
            >
              <Sliders size={13} />
              <span>Inspector</span>
              <kbd className="font-mono text-[10px] bg-slate-900 text-slate-400 px-1 rounded border border-slate-700">⌘I</kbd>
            </Button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <MetricCard title="Total Pipeline Runs" value="24" trend="+12% velocity" icon={Zap} />
          <MetricCard title="Active Deployments" value="18" trend="98% uptime" icon={Rocket} />
          <MetricCard title="Built Images" value="42" trend="Registered artifacts" icon={Package} />
          <MetricCard title="AI Diagnostics" value="0" trend="Zero critical risks" icon={Sparkles} />
        </div>

        {/* MAIN SPLIT-PANE WORKSPACE BODY WITH DRAGGABLE RESIZABLE PANELS */}
        <div className="flex-1 min-h-0">
          <Group orientation="horizontal" id="opspilot-horizontal-layout">
            {/* CENTER WORKSPACE PANEL */}
            <Panel id="center-workspace-panel" defaultSize={75} minSize={40}>
              <div className="flex flex-col h-full space-y-4 pr-2 overflow-y-auto">
                {/* WORKSPACE NAVIGATION TABS */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0 select-none text-xs">
                  {[
                    { id: 'overview', label: 'Timeline & Overview', icon: Activity },
                    { id: 'logs', label: 'Terminal Logs', icon: Terminal },
                    { id: 'ai', label: 'AI Risk Analysis', icon: Sparkles },
                    { id: 'variables', label: 'Environment Variables', icon: FileCode },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-slate-950 text-slate-100 border border-slate-800'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon size={14} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* TAB CONTENT 1: TIMELINE & VERTICAL RESIZABLE LOG STREAM */}
                {activeTab === 'overview' && (
                  <Group orientation="vertical" id="opspilot-vertical-layout" className="flex-1 min-h-[350px]">
                    <Panel id="timeline-subpanel" defaultSize={45} minSize={25}>
                      <TimelinePanel className="h-full" />
                    </Panel>

                    {/* Vertical Drag Handle */}
                    <Separator className="h-1.5 bg-slate-900 hover:bg-blue-500/50 transition-colors my-1 cursor-row-resize rounded" />

                    <Panel id="terminal-subpanel" defaultSize={55} minSize={25}>
                      <TerminalPanel title="Runner Output (Live Stream)" status="Healthy" className="h-full" />
                    </Panel>
                  </Group>
                )}

                {/* TAB CONTENT 2: TERMINAL LOGS */}
                {activeTab === 'logs' && (
                  <div className="flex-1 min-h-[320px]">
                    <TerminalPanel title="Production Worker Execution Stream" status="RUNNING" className="h-full" />
                  </div>
                )}

                {/* TAB CONTENT 3: AI DIAGNOSTICS */}
                {activeTab === 'ai' && (
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                      <Sparkles size={16} className="text-slate-300" />
                      <span>OpsPilot AI Contextual Risk Analysis</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>Confidence: 98%</strong> — All security scans, container vulnerability checks, and integration test suites passed without regression risks.
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <Badge status="healthy">● Zero Vulnerabilities</Badge>
                      <Badge status="healthy">● Ready for Production</Badge>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT 4: ENVIRONMENT VARIABLES */}
                {activeTab === 'variables' && (
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Pipeline Environment Variables</h3>
                    <div className="space-y-3">
                      <Input label="NODE_ENV" defaultValue="production" />
                      <Input label="PORT" defaultValue="3000" />
                      <Input label="DATABASE_URL" defaultValue="postgresql://opspilot:secret@postgres:5432/opspilot" />
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* HORIZONTAL DRAG HANDLE FOR INSPECTOR */}
            {inspectorOpen && (
              <>
                <Separator className="w-1.5 bg-slate-900 hover:bg-blue-500/50 transition-colors mx-1 cursor-col-resize rounded" />
                <Panel id="inspector-panel" defaultSize={25} minSize={20} maxSize={40}>
                  <InspectorPanel onClose={() => setInspectorOpen(false)} className="w-full h-full">
                    <PropertiesPanel title="Pipeline Properties" />
                    <PropertiesPanel 
                      title="Runner Constraints" 
                      items={[
                        { label: 'Executor', value: 'Docker Runner' },
                        { label: 'CPU Limit', value: '2.0 Cores' },
                        { label: 'Memory Limit', value: '1024MB' },
                        { label: 'Storage', value: 'Ephemeral 10GB' },
                      ]} 
                    />
                    <ErrorBanner />
                  </InspectorPanel>
                </Panel>
              </>
            )}
          </Group>
        </div>
      </div>
    </DeveloperShell>
  );
}
