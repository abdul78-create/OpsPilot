'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Search, ChevronRight, Terminal, GitBranch, Rocket, Shield,
  Activity, Sparkles, Key, Users, CreditCard, Copy, Check
} from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

const DOC_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    articles: [
      { id: 'intro', title: 'Introduction to OpsPilot' },
      { id: 'quickstart', title: 'Quickstart Guide' },
      { id: 'concepts', title: 'Core Architecture' },
    ],
  },
  {
    id: 'pipelines',
    title: 'CI/CD Pipelines',
    icon: GitBranch,
    articles: [
      { id: 'zero-config', title: 'Zero-Config Compilation' },
      { id: 'yaml-schema', title: 'Pipeline YAML Schema' },
      { id: 'docker-runners', title: 'Isolated Docker Runners' },
    ],
  },
  {
    id: 'deployments',
    title: 'Deployments & Rollbacks',
    icon: Rocket,
    articles: [
      { id: 'environments', title: 'Multi-Environment Management' },
      { id: 'auto-rollback', title: 'Automated Rollback Engine' },
      { id: 'health-probes', title: 'Live Health Checks' },
    ],
  },
  {
    id: 'observability',
    title: 'Observability & Logs',
    icon: Activity,
    articles: [
      { id: 'sse-streaming', title: 'Real-Time SSE Log Streaming' },
      { id: 'prometheus', title: 'Prometheus Metrics Export' },
    ],
  },
  {
    id: 'ai-ops',
    title: 'AI Root Cause Analysis',
    icon: Sparkles,
    articles: [
      { id: 'rca-engine', title: 'Automated Log Failure Diagnosis' },
      { id: 'ai-copilot', title: 'Conversational OpsPilot Assistant' },
    ],
  },
  {
    id: 'security-rbac',
    title: 'Security & RBAC',
    icon: Shield,
    articles: [
      { id: 'aes-encryption', title: 'AES-256-GCM Secrets Vault' },
      { id: 'tenant-isolation', title: 'Multi-Tenant Boundary Controls' },
      { id: 'member-roles', title: 'Organization Member Roles' },
    ],
  },
];

export default function DocsPage() {
  const [selectedArticle, setSelectedArticle] = useState('intro');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Top Navbar */}
      <header
        className="h-16 border-b sticky top-0 z-50 flex items-center justify-between px-8 backdrop-blur-md"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 text-decoration-none">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              OP
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
              OpsPilot Docs
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-4 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:opacity-80 transition-opacity">Home</Link>
            <Link href="/features" className="hover:opacity-80 transition-opacity">Features</Link>
            <Link href="/pricing" className="hover:opacity-80 transition-opacity">Pricing</Link>
            <Link href="/security" className="hover:opacity-80 transition-opacity">Security</Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-2.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search documentation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="text-xs font-bold px-4 py-2 rounded-xl transition-opacity hover:opacity-80 shrink-0"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Go to Console
          </Link>
        </div>
      </header>

      {/* Body Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full flex">
        {/* Sidebar Navigation */}
        <aside
          className="w-64 border-r p-6 space-y-6 shrink-0 hidden md:block"
          style={{ borderColor: 'var(--border)' }}
        >
          {DOC_SECTIONS.map((sec) => (
            <div key={sec.id} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                <sec.icon size={14} style={{ color: 'var(--text-primary)' }} />
                <span>{sec.title}</span>
              </div>
              <div className="space-y-1 pl-4 border-l" style={{ borderColor: 'var(--border)' }}>
                {sec.articles.map((art) => {
                  const active = selectedArticle === art.id;
                  return (
                    <button
                      key={art.id}
                      onClick={() => setSelectedArticle(art.id)}
                      className="w-full text-left text-xs py-1.5 px-2 rounded-lg transition-colors truncate block"
                      style={{
                        background: active ? 'var(--bg-tertiary)' : 'transparent',
                        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {art.title}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Main Documentation Viewer */}
        <main className="flex-1 p-8 max-w-4xl space-y-8">
          {selectedArticle === 'intro' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>Getting Started</div>
                <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Introduction to OpsPilot</h1>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  OpsPilot is an enterprise-grade CI/CD and automated deployment platform designed for modern engineering teams shipping code at high velocity.
                </p>
              </div>

              <div
                className="p-6 rounded-2xl border space-y-4"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              >
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Core Capabilities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div
                    className="p-4 rounded-xl border space-y-1"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                  >
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>⚡ Zero-Config Compilation</span>
                    <p style={{ color: 'var(--text-muted)' }}>Pushes code directly from GitHub, automatically compiling isolated Docker runner workflows.</p>
                  </div>
                  <div
                    className="p-4 rounded-xl border space-y-1"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                  >
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>🔄 Automated Rollbacks</span>
                    <p style={{ color: 'var(--text-muted)' }}>Live HTTP health probes monitor releases and revert broken deployments automatically.</p>
                  </div>
                  <div
                    className="p-4 rounded-xl border space-y-1"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                  >
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>📡 SSE Log Streaming</span>
                    <p style={{ color: 'var(--text-muted)' }}>Real-time stdout log streaming with Server-Sent Events and historical log redaction.</p>
                  </div>
                  <div
                    className="p-4 rounded-xl border space-y-1"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                  >
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>🤖 AI Root Cause Analysis</span>
                    <p style={{ color: 'var(--text-muted)' }}>Event-driven log analysis providing evidence-backed failure diagnoses and fix suggestions.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Quick API Example</h3>
                <div
                  className="relative p-4 rounded-xl border font-mono text-xs overflow-x-auto"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  <button
                    onClick={() => handleCopyCode('curl -X POST http://localhost:3000/v1/pipelines/pipe_123/runs -H "Authorization: Bearer <token>"')}
                    className="absolute right-3 top-3 p-1.5 rounded-lg border transition-colors"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                  </button>
                  <code>curl -X POST http://localhost:3000/v1/pipelines/pipe_123/runs \<br />  -H &quot;Authorization: Bearer &lt;token&gt;&quot; \<br />  -H &quot;Content-Type: application/json&quot; \<br />  -d &apos;&#123;&quot;branch&quot;: &quot;main&quot;&#125;&apos;</code>
                </div>
              </div>
            </div>
          )}

          {selectedArticle !== 'intro' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>Documentation Article</div>
                <h1 className="text-3xl font-extrabold capitalize tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {selectedArticle.replace('-', ' ')}
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Comprehensive reference and step-by-step guides for setting up and managing your OpsPilot CI/CD workflows.
                </p>
              </div>

              <div
                className="p-6 rounded-2xl border text-xs space-y-4"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <p>Detailed specification, schema documentation, and API endpoints for <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedArticle}</span> are active and verified across OpsPilot REST APIs.</p>
                <div
                  className="p-4 rounded-xl border font-mono"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  GET /v1/organizations/:orgId/pipelines
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 px-8 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        OpsPilot SaaS Platform · Enterprise CI/CD & Deployment Engine Documentation
      </footer>
    </div>
  );
}
