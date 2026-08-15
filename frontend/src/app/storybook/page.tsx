'use client';

import React, { useState } from 'react';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Panel, PanelHeader, PanelTitle, PanelDescription, PanelContent } from '@/components/ui/panel';
import { MetricCard } from '@/components/domain/MetricCard';
import { TerminalPanel } from '@/components/domain/TerminalPanel';
import { TimelinePanel } from '@/components/domain/TimelinePanel';
import { InspectorPanel } from '@/components/domain/InspectorPanel';
import { PropertiesPanel } from '@/components/domain/PropertiesPanel';
import { ErrorBanner } from '@/components/ui/error-boundary';
import { WorkspaceSkeleton, TerminalSkeleton, TimelineSkeleton, MetricCardSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';
import { Zap, BookOpen, Layers, Box, CheckCircle2 } from 'lucide-react';

export default function StorybookPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'all' | 'primitives' | 'domain' | 'skeletons'>('all');

  return (
    <DeveloperShell>
      <div className="space-y-8 pb-12">
        {/* Storybook Header */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-blue-400">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">OpsPilot Component Catalog</h1>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">Design System Primitives & Business Components Single Source of Truth</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {['all', 'primitives', 'domain', 'skeletons'].map((sec) => (
              <button
                key={sec}
                onClick={() => setActiveSection(sec as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  activeSection === sec
                    ? 'bg-slate-100 text-slate-950 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 1: PRIMITIVES */}
        {(activeSection === 'all' || activeSection === 'primitives') && (
          <div className="space-y-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              UI Primitives (`src/components/ui/`)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* BUTTONS */}
              <Panel>
                <PanelHeader>
                  <PanelTitle>Button Component System</PanelTitle>
                  <PanelDescription>Semantic variants and loading states (`cva`).</PanelDescription>
                </PanelHeader>
                <PanelContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button isLoading variant="primary">Loading</Button>
                  </div>
                </PanelContent>
              </Panel>

              {/* MONOCHROME BADGES */}
              <Panel>
                <PanelHeader>
                  <PanelTitle>Monochrome Badges</PanelTitle>
                  <PanelDescription>Strict status indicators relying on typography and stroke icons.</PanelDescription>
                </PanelHeader>
                <PanelContent className="flex flex-wrap gap-2">
                  <Badge status="healthy">● Healthy</Badge>
                  <Badge status="pending">◌ Pending</Badge>
                  <Badge status="review">▲ Review Required</Badge>
                  <Badge status="failed">✕ Failed</Badge>
                  <Badge status="neutral">v2.0-next</Badge>
                </PanelContent>
              </Panel>

              {/* INPUTS & ERROR BANNER */}
              <Panel className="md:col-span-2">
                <PanelHeader>
                  <PanelTitle>Form Inputs & Actionable Error Banner</PanelTitle>
                  <PanelDescription>Inputs with semantic focus rings and error banners with Request ID.</PanelDescription>
                </PanelHeader>
                <PanelContent className="space-y-4">
                  <Input label="Pipeline Key" defaultValue="prod-backend-api" helperText="Unique identifier" />
                  <ErrorBanner 
                    title="Runner Execution Timeout" 
                    message="Job step build-docker timed out after 300s." 
                    requestId="req_79a20b12c8" 
                    onRetry={() => alert('Retrying job...')} 
                  />
                </PanelContent>
              </Panel>
            </div>
          </div>
        )}

        {/* SECTION 2: DOMAIN BUSINESS COMPONENTS */}
        {(activeSection === 'all' || activeSection === 'domain') && (
          <div className="space-y-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              Domain Business Components (`src/components/domain/`)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard title="Total Pipeline Runs" value="24" trend="+12% velocity" icon={Zap} />
              <MetricCard title="Active Deployments" value="18" trend="98% uptime" icon={Zap} />
              <MetricCard title="Built Images" value="42" trend="Registered" icon={Zap} />
              <MetricCard title="AI Diagnostics" value="0" trend="Zero risks" icon={Zap} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <TimelinePanel />
                <TerminalPanel />
              </div>
              <div>
                <PropertiesPanel />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: SKELETONS & EMPTY STATES */}
        {(activeSection === 'all' || activeSection === 'skeletons') && (
          <div className="space-y-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              Skeletons & Actionable Empty States
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Panel>
                <PanelHeader>
                  <PanelTitle>Dedicated Skeleton Placeholders</PanelTitle>
                  <PanelDescription>UI-matched pulse loading placeholders.</PanelDescription>
                </PanelHeader>
                <PanelContent className="space-y-4">
                  <MetricCardSkeleton />
                  <TimelineSkeleton />
                </PanelContent>
              </Panel>

              <EmptyState
                icon={Box}
                title="No Deployments Triggered"
                description="Trigger your first deployment to start promoting artifacts to production environments."
                actionLabel="+ Deploy Artifact"
                onAction={() => setModalOpen(true)}
              />
            </div>
          </div>
        )}

        {/* DIALOG DEMO MODAL */}
        <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="Component Showcase Modal">
          <p className="text-xs text-slate-300">Dialog primitive tested from Storybook catalog.</p>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Close</Button>
          </div>
        </Dialog>
      </div>
    </DeveloperShell>
  );
}
