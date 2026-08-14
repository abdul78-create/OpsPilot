'use client';

import React from 'react';
import Link from 'next/link';
import {
  Zap, GitBranch, Shield, Rocket, Activity, Sparkles, Key, CheckCircle2, ArrowRight
} from 'lucide-react';

const FEATURES_DETAIL = [
  {
    icon: Zap,
    title: 'Zero-Config CI/CD Pipelines',
    desc: 'Push code directly to GitHub. OpsPilot automatically scans repo metadata, detects your tech stack (Node.js, Python, Go, Docker), and compiles isolated runner workflows without manual YAML configuration.',
    badge: 'Automation',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    icon: Rocket,
    title: 'Multi-Environment Deployment & Automated Rollbacks',
    desc: 'Deploy across production, staging, preview, and development environments. Integrated live HTTP health probes monitor every release and automatically trigger zero-downtime rollbacks if a release fails.',
    badge: 'Reliability',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: Sparkles,
    title: 'AI Root Cause Analysis & Copilot Assistant',
    desc: 'Event-driven AI automatically analyzes failed build stdout logs, producing structured diagnosis reports with confidence scores, root causes, evidence log snippets, and fix recommendations.',
    badge: 'AI Layer',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: Activity,
    title: 'Real-Time Observability & Prometheus Metrics',
    desc: 'Watch build progress via Server-Sent Events (SSE) log streaming. Monitor database, Redis, and container memory utilization with native Prometheus exposition format metrics exports.',
    badge: 'Telemetry',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    icon: Shield,
    title: 'Enterprise Secrets Vault & Multi-Tenant RBAC',
    desc: 'Store environment secrets encrypted with AES-256-GCM and audit reveal logs. Multi-tenant boundary controls enforce strict role-based access control (Owner, Admin, Developer, Viewer, Billing).',
    badge: 'Security',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col justify-between">
      {/* Header Navigation */}
      <header className="h-16 border-b border-[#27272A] bg-[#111113]/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg">
            OP
          </div>
          <span className="font-bold text-sm text-white tracking-tight">OpsPilot</span>
        </Link>

        <div className="flex items-center gap-6 text-xs font-semibold text-zinc-400">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/features" className="text-white font-bold">Features</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          <Link href="/security" className="hover:text-white transition-colors">Security</Link>
        </div>

        <Link
          href="/dashboard"
          className="text-xs bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-lg"
        >
          Open Console
        </Link>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto w-full py-16 px-6 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
            Commercial SaaS Feature Matrix
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Built for Modern DevOps & Platform Engineering
          </h1>
          <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
            OpsPilot unifies code compilation, isolated container runs, multi-environment deployments, real-time log streaming, AI failure diagnosis, and secrets security into one cohesive SaaS platform.
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-8">
          {FEATURES_DETAIL.map((feat, i) => (
            <div
              key={i}
              className={`p-8 rounded-2xl bg-[#111113] border ${feat.border} shadow-2xl flex flex-col md:flex-row gap-6 items-start justify-between`}
            >
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${feat.bg} ${feat.color}`}>
                    <feat.icon size={22} />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 px-2.5 py-0.5 rounded-full bg-[#18181B] border border-[#27272A]">
                    {feat.badge}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{feat.title}</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
              </div>

              <div className="shrink-0 pt-2">
                <Link
                  href="/dashboard"
                  className="py-2.5 px-4 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-zinc-200 text-xs font-bold transition-all flex items-center gap-2 border border-[#27272A]"
                >
                  Explore in Dashboard <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272A] bg-[#111113] py-8 text-center text-xs text-zinc-500">
        OpsPilot SaaS Platform · Enterprise CI/CD & Deployment Engine
      </footer>
    </div>
  );
}
