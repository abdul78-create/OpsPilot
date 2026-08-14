'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Search, ChevronRight, Terminal, GitBranch, Rocket, Shield,
  Activity, Sparkles, Key, Users, CreditCard, Copy, Check
} from 'lucide-react';

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
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-[#27272A] bg-[#111113]/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg">
              OP
            </div>
            <span className="font-bold text-sm text-white tracking-tight">OpsPilot Docs</span>
          </Link>
          <div className="hidden md:flex items-center gap-4 text-xs font-semibold text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/security" className="hover:text-white transition-colors">Security</Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <Link
            href="/dashboard"
            className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 py-2 rounded-xl transition-colors shadow-lg"
          >
            Go to Console
          </Link>
        </div>
      </header>

      {/* Body Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-[#27272A] p-6 space-y-6 shrink-0 hidden md:block">
          {DOC_SECTIONS.map((sec) => (
            <div key={sec.id} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <sec.icon size={14} className="text-violet-400" />
                <span>{sec.title}</span>
              </div>
              <div className="space-y-1 pl-4 border-l border-[#27272A]">
                {sec.articles.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => setSelectedArticle(art.id)}
                    className={`w-full text-left text-xs py-1.5 px-2 rounded-lg transition-colors truncate block ${
                      selectedArticle === art.id
                        ? 'bg-violet-500/10 text-violet-300 font-semibold border-l-2 border-violet-500 -ml-[17px] pl-[15px]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181B]'
                    }`}
                  >
                    {art.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Main Documentation Viewer */}
        <main className="flex-1 p-8 max-w-4xl space-y-8">
          {selectedArticle === 'intro' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Getting Started</div>
                <h1 className="text-3xl font-extrabold text-white">Introduction to OpsPilot</h1>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  OpsPilot is an enterprise-grade CI/CD and automated deployment platform designed for modern engineering teams shipping code at high velocity.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#111113] border border-[#27272A] space-y-4">
                <h2 className="text-base font-bold text-white">Core Capabilities</h2>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
                    <span className="font-bold text-violet-300">⚡ Zero-Config Compilation</span>
                    <p className="text-zinc-400">Pushes code directly from GitHub, automatically compiling isolated Docker runner workflows.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
                    <span className="font-bold text-blue-300">🔄 Automated Rollbacks</span>
                    <p className="text-zinc-400">Live HTTP health probes monitor releases and revert broken deployments automatically.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
                    <span className="font-bold text-cyan-300">📡 SSE Log Streaming</span>
                    <p className="text-zinc-400">Real-time stdout log streaming with Server-Sent Events and historical log redaction.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
                    <span className="font-bold text-emerald-300">🤖 AI Root Cause Analysis</span>
                    <p className="text-zinc-400">Event-driven log analysis providing evidence-backed failure diagnoses and fix suggestions.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white">Quick API Example</h3>
                <div className="relative p-4 rounded-xl bg-[#18181B] border border-[#27272A] font-mono text-xs text-zinc-300 overflow-x-auto">
                  <button
                    onClick={() => handleCopyCode('curl -X POST http://localhost:3000/v1/pipelines/pipe_123/runs -H "Authorization: Bearer <token>"')}
                    className="absolute right-3 top-3 p-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-zinc-400 hover:text-white transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <code>curl -X POST http://localhost:3000/v1/pipelines/pipe_123/runs \<br />  -H "Authorization: Bearer &lt;token&gt;" \<br />  -H "Content-Type: application/json" \<br />  -d '&#123;"branch": "main"&#125;'</code>
                </div>
              </div>
            </div>
          )}

          {selectedArticle !== 'intro' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Documentation Article</div>
                <h1 className="text-3xl font-extrabold text-white capitalize">{selectedArticle.replace('-', ' ')}</h1>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Comprehensive reference and step-by-step guides for setting up and managing your OpsPilot CI/CD workflows.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#111113] border border-[#27272A] text-xs text-zinc-300 space-y-4">
                <p>Detailed specification, schema documentation, and API endpoints for <span className="font-semibold text-white">{selectedArticle}</span> are active and verified across OpsPilot REST APIs.</p>
                <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] font-mono text-violet-300">
                  GET /v1/organizations/:orgId/pipelines
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#27272A] bg-[#111113] py-6 px-8 text-center text-xs text-zinc-500">
        OpsPilot SaaS Platform · Enterprise CI/CD & Deployment Engine Documentation
      </footer>
    </div>
  );
}
