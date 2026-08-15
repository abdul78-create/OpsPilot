'use client';

import React from 'react';
import Link from 'next/link';
import {
  Zap, GitBranch, Shield, Rocket, Activity, Sparkles, Key, CheckCircle2, ArrowRight
} from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

const FEATURES_DETAIL = [
  {
    icon: Zap,
    title: 'Zero-Config CI/CD Pipelines',
    desc: 'Push code directly to GitHub. OpsPilot automatically scans repo metadata, detects your tech stack (Node.js, Python, Go, Docker), and compiles isolated runner workflows without manual YAML configuration.',
    badge: 'Automation',
  },
  {
    icon: Rocket,
    title: 'Multi-Environment Deployment & Automated Rollbacks',
    desc: 'Deploy across production, staging, preview, and development environments. Integrated live HTTP health probes monitor every release and automatically trigger zero-downtime rollbacks if a release fails.',
    badge: 'Reliability',
  },
  {
    icon: Sparkles,
    title: 'AI Root Cause Analysis & Copilot Assistant',
    desc: 'Event-driven AI automatically analyzes failed build stdout logs, producing structured diagnosis reports with confidence scores, root causes, evidence log snippets, and fix recommendations.',
    badge: 'AI Layer',
  },
  {
    icon: Activity,
    title: 'Real-Time Observability & Prometheus Metrics',
    desc: 'Watch build progress via Server-Sent Events (SSE) log streaming. Monitor database, Redis, and container memory utilization with native Prometheus exposition format metrics exports.',
    badge: 'Telemetry',
  },
  {
    icon: Shield,
    title: 'Enterprise Secrets Vault & Multi-Tenant RBAC',
    desc: 'Store environment secrets encrypted with AES-256-GCM and audit reveal logs. Multi-tenant boundary controls enforce strict role-based access control (Owner, Admin, Developer, Viewer, Billing).',
    badge: 'Security',
  },
];

export default function FeaturesPage() {
  return (
    <div
      className="min-h-screen flex flex-col justify-between"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header Navigation */}
      <header
        className="h-16 border-b sticky top-0 z-50 flex items-center justify-between px-8 backdrop-blur-md"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
      >
        <Link href="/" className="flex items-center gap-3 text-decoration-none">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            OP
          </div>
          <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
            OpsPilot
          </span>
        </Link>

        <div className="flex items-center gap-6 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" className="hover:opacity-80 transition-opacity">Home</Link>
          <Link href="/features" className="font-bold" style={{ color: 'var(--text-primary)' }}>Features</Link>
          <Link href="/pricing" className="hover:opacity-80 transition-opacity">Pricing</Link>
          <Link href="/docs" className="hover:opacity-80 transition-opacity">Docs</Link>
          <Link href="/security" className="hover:opacity-80 transition-opacity">Security</Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-xs font-bold px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto w-full py-16 px-6 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span
            className="text-[11px] font-bold border px-3 py-1 rounded-full uppercase tracking-wider font-mono"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            SaaS Feature Matrix
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Built for Modern DevOps & Platform Engineering
          </h1>
          <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            OpsPilot unifies code compilation, isolated container runs, multi-environment deployments, real-time log streaming, AI failure diagnosis, and secrets security into one cohesive SaaS platform.
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-6">
          {FEATURES_DETAIL.map((feat, i) => (
            <div
              key={i}
              className="p-8 rounded-2xl border flex flex-col md:flex-row gap-6 items-start justify-between transition-all"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-xl border"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <feat.icon size={20} />
                  </div>
                  <span
                    className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    {feat.badge}
                  </span>
                </div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{feat.title}</h2>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{feat.desc}</p>
              </div>

              <div className="shrink-0 pt-2">
                <Link
                  href="/dashboard"
                  className="py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>Explore in Console</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        OpsPilot SaaS Platform · Enterprise CI/CD & Deployment Engine
      </footer>
    </div>
  );
}
